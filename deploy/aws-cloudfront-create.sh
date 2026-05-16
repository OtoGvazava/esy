#!/usr/bin/env bash
# One-time: create the CloudFront distribution that fronts BOTH the S3 SPA and
# the EC2 API under one HTTPS domain (so the frontend's relative /api calls work
# with no CORS and no mixed-content). Re-running creates a NEW distribution —
# only run once; afterwards just re-run aws-s3-deploy.sh to ship frontend updates.
#
#   S3_WEBSITE_DOMAIN=esy-web-7f3a.s3-website-us-east-1.amazonaws.com \
#   EC2_PUBLIC_DNS=ec2-1-2-3-4.compute-1.amazonaws.com \
#     ./deploy/aws-cloudfront-create.sh
set -euo pipefail

: "${S3_WEBSITE_DOMAIN:?S3 website endpoint from aws-s3-deploy.sh (no http://)}"
: "${EC2_PUBLIC_DNS:?EC2 instance Public IPv4 DNS}"
REF="esy-$(date +%s)"

# AWS-managed policies: CachingOptimized (static), CachingDisabled + AllViewer
# (API passthrough — forwards Authorization, disables caching).
CACHE_OPT=658327ea-f89d-4fab-a63d-7e88639e58f6
CACHE_OFF=4135ea2d-6df8-44a3-9df3-4b5a84be39ad
ALL_VIEWER=216adef6-5c7f-47e4-b989-5492eafa07d3

# Optional custom domain. Provide BOTH to serve on your own HTTPS domain:
#   DOMAIN=shop.example.com  ACM_CERT_ARN=arn:aws:acm:us-east-1:...:certificate/...
# (ACM cert MUST be in us-east-1 for CloudFront — see deploy/aws-acm-route53.sh)
if [ -n "${DOMAIN:-}" ] && [ -n "${ACM_CERT_ARN:-}" ]; then
  ALIASES="\"Aliases\": { \"Quantity\": 1, \"Items\": [\"$DOMAIN\"] },"
  VIEWER_CERT="{ \"ACMCertificateArn\": \"$ACM_CERT_ARN\", \"SSLSupportMethod\": \"sni-only\", \"MinimumProtocolVersion\": \"TLSv1.2_2021\", \"Certificate\": \"$ACM_CERT_ARN\", \"CertificateSource\": \"acm\" }"
  echo "==> Custom domain: $DOMAIN"
else
  ALIASES="\"Aliases\": { \"Quantity\": 0 },"
  VIEWER_CERT="{ \"CloudFrontDefaultCertificate\": true }"
  echo "==> No custom domain (using the *.cloudfront.net cert)"
fi

cat > /tmp/esy-cf.json <<JSON
{
  "CallerReference": "$REF",
  "Comment": "esy storefront",
  $ALIASES
  "Enabled": true,
  "DefaultRootObject": "index.html",
  "Origins": { "Quantity": 2, "Items": [
    { "Id": "s3-web", "DomainName": "$S3_WEBSITE_DOMAIN", "OriginPath": "",
      "CustomHeaders": { "Quantity": 0 },
      "CustomOriginConfig": { "HTTPPort": 80, "HTTPSPort": 443,
        "OriginProtocolPolicy": "http-only",
        "OriginSslProtocols": { "Quantity": 1, "Items": ["TLSv1.2"] },
        "OriginReadTimeout": 30, "OriginKeepaliveTimeout": 5 } },
    { "Id": "ec2-api", "DomainName": "$EC2_PUBLIC_DNS", "OriginPath": "",
      "CustomHeaders": { "Quantity": 0 },
      "CustomOriginConfig": { "HTTPPort": 8080, "HTTPSPort": 443,
        "OriginProtocolPolicy": "http-only",
        "OriginSslProtocols": { "Quantity": 1, "Items": ["TLSv1.2"] },
        "OriginReadTimeout": 30, "OriginKeepaliveTimeout": 5 } }
  ] },
  "DefaultCacheBehavior": {
    "TargetOriginId": "s3-web",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": { "Quantity": 2, "Items": ["GET","HEAD"],
      "CachedMethods": { "Quantity": 2, "Items": ["GET","HEAD"] } },
    "Compress": true,
    "CachePolicyId": "$CACHE_OPT"
  },
  "CacheBehaviors": { "Quantity": 1, "Items": [
    { "PathPattern": "/api/*", "TargetOriginId": "ec2-api",
      "ViewerProtocolPolicy": "redirect-to-https",
      "AllowedMethods": { "Quantity": 7,
        "Items": ["GET","HEAD","OPTIONS","PUT","POST","PATCH","DELETE"],
        "CachedMethods": { "Quantity": 2, "Items": ["GET","HEAD"] } },
      "Compress": false,
      "CachePolicyId": "$CACHE_OFF",
      "OriginRequestPolicyId": "$ALL_VIEWER" }
  ] },
  "ViewerCertificate": $VIEWER_CERT,
  "PriceClass": "PriceClass_100",
  "HttpVersion": "http2"
}
JSON

echo "==> Creating CloudFront distribution"
OUT=$(aws cloudfront create-distribution --distribution-config file:///tmp/esy-cf.json)
ID=$(echo "$OUT"  | python3 -c "import sys,json;print(json.load(sys.stdin)['Distribution']['Id'])")
DOM=$(echo "$OUT" | python3 -c "import sys,json;print(json.load(sys.stdin)['Distribution']['DomainName'])")
echo
echo "  DISTRIBUTION_ID    = $ID   (use for cache invalidations / GitHub var)"
echo "  CLOUDFRONT_DOMAIN  = $DOM"
if [ -n "${DOMAIN:-}" ]; then
  echo "  APP URL            = https://$DOMAIN  (after you create the Route 53"
  echo "                       alias: DOMAIN=$DOMAIN HOSTED_ZONE_ID=... \\"
  echo "                       CLOUDFRONT_DOMAIN=$DOM ./deploy/aws-route53-alias.sh)"
else
  echo "  APP URL            = https://$DOM"
fi
echo
echo "It takes ~5-15 min to deploy. Save DISTRIBUTION_ID for redeploys/CI."
