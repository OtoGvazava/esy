#!/usr/bin/env bash
# Request an ACM certificate for your domain (MUST be us-east-1 for CloudFront),
# auto-create the DNS validation record in Route 53, and wait until issued.
# Prints ACM_CERT_ARN — pass it to aws-cloudfront-create.sh.
#
#   DOMAIN=shop.example.com HOSTED_ZONE_ID=Z0123456ABCDEF \
#     ./deploy/aws-acm-route53.sh
#
# HOSTED_ZONE_ID = the Route 53 hosted zone for your domain (Route 53 console
# > Hosted zones). The domain must be registered and its NS delegated here.
set -euo pipefail

: "${DOMAIN:?e.g. shop.example.com}"
: "${HOSTED_ZONE_ID:?Route 53 hosted zone id for the domain}"
ACM_REGION=us-east-1

echo "==> Requesting ACM cert for $DOMAIN (us-east-1)"
ARN=$(aws acm request-certificate --region "$ACM_REGION" \
  --domain-name "$DOMAIN" --validation-method DNS \
  --query CertificateArn --output text)
echo "  $ARN"

echo "==> Waiting for the DNS validation record to be assigned…"
for _ in $(seq 1 30); do
  RR=$(aws acm describe-certificate --region "$ACM_REGION" --certificate-arn "$ARN" \
    --query "Certificate.DomainValidationOptions[0].ResourceRecord" --output json)
  [ "$RR" != "null" ] && [ -n "$RR" ] && break
  sleep 4
done
NAME=$(echo "$RR" | python3 -c "import sys,json;print(json.load(sys.stdin)['Name'])")
VALUE=$(echo "$RR" | python3 -c "import sys,json;print(json.load(sys.stdin)['Value'])")
echo "  validation CNAME: $NAME -> $VALUE"

echo "==> Upserting validation record into Route 53"
aws route53 change-resource-record-sets --hosted-zone-id "$HOSTED_ZONE_ID" \
  --change-batch "{\"Changes\":[{\"Action\":\"UPSERT\",\"ResourceRecordSet\":{
    \"Name\":\"$NAME\",\"Type\":\"CNAME\",\"TTL\":300,
    \"ResourceRecords\":[{\"Value\":\"$VALUE\"}]}}]}" >/dev/null

echo "==> Waiting for certificate to be ISSUED (a few minutes)…"
aws acm wait certificate-validated --region "$ACM_REGION" --certificate-arn "$ARN"

echo
echo "Certificate ISSUED."
echo "  ACM_CERT_ARN = $ARN"
echo "Next: DOMAIN=$DOMAIN ACM_CERT_ARN=$ARN S3_WEBSITE_DOMAIN=... EC2_PUBLIC_DNS=... \\"
echo "      ./deploy/aws-cloudfront-create.sh"
