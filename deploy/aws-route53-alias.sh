#!/usr/bin/env bash
# Point your domain at the CloudFront distribution (Route 53 alias A + AAAA).
# Run AFTER aws-cloudfront-create.sh (which prints CLOUDFRONT_DOMAIN).
#
#   DOMAIN=shop.example.com HOSTED_ZONE_ID=Z0123456ABCDEF \
#   CLOUDFRONT_DOMAIN=dxxxx.cloudfront.net \
#     ./deploy/aws-route53-alias.sh
set -euo pipefail

: "${DOMAIN:?e.g. shop.example.com}"
: "${HOSTED_ZONE_ID:?Route 53 hosted zone id}"
: "${CLOUDFRONT_DOMAIN:?the dxxxx.cloudfront.net domain from aws-cloudfront-create.sh}"

# CloudFront's fixed hosted-zone id for alias targets (global, constant).
CF_ZONE=Z2FDTNDATAQYW2

echo "==> Aliasing $DOMAIN -> $CLOUDFRONT_DOMAIN"
aws route53 change-resource-record-sets --hosted-zone-id "$HOSTED_ZONE_ID" \
  --change-batch "{\"Changes\":[
    {\"Action\":\"UPSERT\",\"ResourceRecordSet\":{\"Name\":\"$DOMAIN\",\"Type\":\"A\",
      \"AliasTarget\":{\"HostedZoneId\":\"$CF_ZONE\",\"DNSName\":\"$CLOUDFRONT_DOMAIN\",\"EvaluateTargetHealth\":false}}},
    {\"Action\":\"UPSERT\",\"ResourceRecordSet\":{\"Name\":\"$DOMAIN\",\"Type\":\"AAAA\",
      \"AliasTarget\":{\"HostedZoneId\":\"$CF_ZONE\",\"DNSName\":\"$CLOUDFRONT_DOMAIN\",\"EvaluateTargetHealth\":false}}}
  ]}" >/dev/null

echo "Done. DNS propagates in a few minutes — then: https://$DOMAIN"
