#!/usr/bin/env bash
# Create (first run) and update the S3 static-site bucket for the frontend,
# then optionally invalidate CloudFront. Run after deploy/build.sh.
#
#   BUCKET=esy-web-<your-unique-suffix> REGION=us-east-1 \
#     [DISTRIBUTION_ID=E123ABC] ./deploy/aws-s3-deploy.sh
#
# Requires the AWS CLI configured (`aws configure`) on a NEW free-tier account.
set -euo pipefail
cd "$(dirname "$0")/.."

: "${BUCKET:?set BUCKET to a globally-unique name, e.g. esy-web-7f3a}"
REGION="${REGION:-us-east-1}"
DIST_DIR="apps/web/dist"
test -f "$DIST_DIR/index.html" || { echo "Run deploy/build.sh first ($DIST_DIR missing)"; exit 1; }

if ! aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
  echo "==> Creating bucket $BUCKET in $REGION"
  if [ "$REGION" = "us-east-1" ]; then
    aws s3api create-bucket --bucket "$BUCKET" --region "$REGION"
  else
    aws s3api create-bucket --bucket "$BUCKET" --region "$REGION" \
      --create-bucket-configuration LocationConstraint="$REGION"
  fi
  aws s3api put-public-access-block --bucket "$BUCKET" \
    --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"
  aws s3 website "s3://$BUCKET/" --index-document index.html --error-document index.html
  aws s3api put-bucket-policy --bucket "$BUCKET" --policy "{
    \"Version\":\"2012-10-17\",
    \"Statement\":[{\"Sid\":\"PublicRead\",\"Effect\":\"Allow\",\"Principal\":\"*\",
      \"Action\":\"s3:GetObject\",\"Resource\":\"arn:aws:s3:::$BUCKET/*\"}]
  }"
fi

echo "==> Syncing $DIST_DIR -> s3://$BUCKET"
# Hashed assets: cache forever. index.html: never cache (so deploys show up).
aws s3 sync "$DIST_DIR" "s3://$BUCKET" --delete \
  --exclude index.html --cache-control "public,max-age=31536000,immutable"
aws s3 cp "$DIST_DIR/index.html" "s3://$BUCKET/index.html" \
  --cache-control "no-cache" --content-type text/html

if [ -n "${DISTRIBUTION_ID:-}" ]; then
  echo "==> Invalidating CloudFront $DISTRIBUTION_ID"
  aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" --paths "/*" >/dev/null
fi

echo "Done. S3 website endpoint:"
echo "  http://$BUCKET.s3-website-$REGION.amazonaws.com  (use this as the CloudFront S3 origin)"
