#!/usr/bin/env bash
# One-time: create the private artifacts bucket + the EC2 instance profile so
# GitHub Actions can roll the backend over SSM (no SSH, no open port 22).
# Re-runnable (idempotent-ish: ignores "already exists").
#
#   ARTIFACTS_BUCKET=esy-artifacts-7f3a REGION=us-east-1 \
#     [EC2_INSTANCE_ID=i-0abc...] ./deploy/aws-iam-setup.sh
#
# If EC2_INSTANCE_ID is given, the profile is also attached to that instance.
set -euo pipefail

: "${ARTIFACTS_BUCKET:?globally-unique private bucket name, e.g. esy-artifacts-7f3a}"
REGION="${REGION:-us-east-1}"
ROLE=esy-ec2-role
PROFILE=esy-ec2-profile

echo "==> Private artifacts bucket: $ARTIFACTS_BUCKET"
if ! aws s3api head-bucket --bucket "$ARTIFACTS_BUCKET" 2>/dev/null; then
  if [ "$REGION" = "us-east-1" ]; then
    aws s3api create-bucket --bucket "$ARTIFACTS_BUCKET" --region "$REGION"
  else
    aws s3api create-bucket --bucket "$ARTIFACTS_BUCKET" --region "$REGION" \
      --create-bucket-configuration LocationConstraint="$REGION"
  fi
  aws s3api put-public-access-block --bucket "$ARTIFACTS_BUCKET" \
    --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
fi

echo "==> IAM role $ROLE"
aws iam create-role --role-name "$ROLE" --assume-role-policy-document '{
  "Version":"2012-10-17",
  "Statement":[{"Effect":"Allow","Principal":{"Service":"ec2.amazonaws.com"},
  "Action":"sts:AssumeRole"}]}' 2>/dev/null || echo "  (role exists)"

aws iam attach-role-policy --role-name "$ROLE" \
  --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore

aws iam put-role-policy --role-name "$ROLE" --policy-name esy-artifacts-read \
  --policy-document "{
    \"Version\":\"2012-10-17\",
    \"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"s3:GetObject\"],
      \"Resource\":\"arn:aws:s3:::$ARTIFACTS_BUCKET/*\"}]}"

echo "==> Instance profile $PROFILE"
aws iam create-instance-profile --instance-profile-name "$PROFILE" 2>/dev/null \
  || echo "  (profile exists)"
aws iam add-role-to-instance-profile --instance-profile-name "$PROFILE" \
  --role-name "$ROLE" 2>/dev/null || echo "  (role already in profile)"

if [ -n "${EC2_INSTANCE_ID:-}" ]; then
  echo "==> Attaching profile to $EC2_INSTANCE_ID"
  sleep 10  # let the instance profile propagate
  aws ec2 associate-iam-instance-profile \
    --instance-id "$EC2_INSTANCE_ID" \
    --iam-instance-profile Name="$PROFILE" 2>/dev/null \
    || echo "  (already associated — or associate it in the EC2 console)"
fi

echo
echo "Done. GitHub repo variables to set:"
echo "  ARTIFACTS_BUCKET = $ARTIFACTS_BUCKET"
echo "If you didn't pass EC2_INSTANCE_ID, attach instance profile '$PROFILE' to"
echo "the instance: EC2 console > Actions > Security > Modify IAM role."
