# Deploy esy to AWS (free-tier path)

One HTTPS site via **CloudFront**, with two origins:

```
                         ┌────────────────────────────── CloudFront (HTTPS, free) ──┐
  browser ──► https://dxxxx.cloudfront.net │  default  /*      → S3  (static SPA)     │
                                           │  behavior /api/*  → EC2 (Spring API)     │
                         └──────────────────────────────────────────────────────────┘
```

Because the SPA and API share the CloudFront domain, the frontend's relative
`/api/...` calls work with **no CORS and no mixed-content** — no frontend code
change needed.

## Cost reality (read this)

- **S3 + CloudFront** (frontend): effectively **free** for low traffic, indefinitely.
- **EC2 `t3.micro`** (backend): **free for 12 months on a brand-new account**, then ~a few $/month. Not free forever.
- **Database**: H2 in **file mode on the EC2 box** → **no DB cost ever** (data persists in `/var/lib/esy/esydb.mv.db`). Single-instance, not highly-available — fine for a small shop/demo. Back that file up.
- When done, **tear everything down** (last section) or the EC2 instance will bill after the free year.

I can't create your AWS account or handle your credentials — you run every `aws`/console step below; the scripts and config here do the heavy lifting.

## 0. Prerequisites

- A **new** AWS account.
- AWS CLI installed and `aws configure` done (an IAM user with admin, or root for setup).
- Locally: **JDK 17** (not 25), Maven, Node 18–22 — only to build artifacts.

## 1. Build the artifacts

```bash
./deploy/build.sh
# -> apps/api/target/ecommerce-platform-0.0.1-SNAPSHOT.jar
# -> apps/web/dist/
```

## 2. Launch the EC2 backend

EC2 → Launch instance:
- AMI **Amazon Linux 2023**, type **t3.micro** (free-tier).
- Create/select a key pair (download the `.pem`).
- Security group inbound:
  - `SSH 22` from **My IP**
  - `Custom TCP 8080` from **Anywhere** (tighten later to the AWS-managed prefix list `com.amazonaws.global.cloudfront.origin-facing` so only CloudFront can reach it).
- **Advanced details → User data**: paste the contents of [`deploy/ec2-user-data.sh`](ec2-user-data.sh).
- Launch. Note the **Public IPv4 DNS** (e.g. `ec2-1-2-3-4.compute-1.amazonaws.com`).

## 3. Ship the jar + set the secret

```bash
JAR=apps/api/target/ecommerce-platform-0.0.1-SNAPSHOT.jar
scp -i key.pem "$JAR" ec2-user@<EC2_PUBLIC_DNS>:/tmp/esy-api.jar
ssh -i key.pem ec2-user@<EC2_PUBLIC_DNS> '
  sudo mv /tmp/esy-api.jar /opt/esy/esy-api.jar &&
  sudo chown esy:esy /opt/esy/esy-api.jar &&
  sudo sed -i "s|CHANGE_ME_to_a_64.*|'"$(openssl rand -hex 40)"'|" /etc/esy/esy-api.env &&
  sudo systemctl restart esy-api &&
  sleep 8 && curl -s localhost:8080/api/products | head -c 200'
```

You should see product JSON. (`systemctl status esy-api` / `journalctl -u esy-api` to debug.)

## 4. Frontend → S3

```bash
BUCKET=esy-web-$(openssl rand -hex 3) REGION=us-east-1 ./deploy/aws-s3-deploy.sh
# prints: http://<bucket>.s3-website-us-east-1.amazonaws.com   <-- copy this
```

## 5. Create CloudFront (one time)

```bash
S3_WEBSITE_DOMAIN=<bucket>.s3-website-us-east-1.amazonaws.com \
EC2_PUBLIC_DNS=<EC2_PUBLIC_DNS> \
  ./deploy/aws-cloudfront-create.sh
# prints DISTRIBUTION_ID and the APP URL (https://dxxxx.cloudfront.net)
```

Wait ~5–15 min for the distribution to deploy, then open the **APP URL**.
Verify: storefront loads products, dev sign-in works (`admin@esy.shop` → admin),
add to bag → checkout → order success.

## 6. Redeploying later (manual)

- **Frontend**: `./deploy/build.sh` then
  `BUCKET=<b> REGION=<r> DISTRIBUTION_ID=<id> ./deploy/aws-s3-deploy.sh` (auto-invalidates).
- **Backend**: `./deploy/build.sh` then repeat step 3 (scp jar + `systemctl restart esy-api`). Data in the H2 file is preserved (`JPA_DDL_AUTO=update`).

(Or set up §8 so `git push` does all of this automatically.)

## 7. Custom domain (Route 53 + ACM)

Prereq: the domain is registered and its **hosted zone is in Route 53** (note its
`HOSTED_ZONE_ID` from the Route 53 console). ACM certs for CloudFront **must** be
in `us-east-1` — the script enforces this.

Do this **instead of plain step 5**:

```bash
# 1) cert + DNS validation (waits until issued, ~minutes)
DOMAIN=shop.example.com HOSTED_ZONE_ID=Z0123456ABCDEF \
  ./deploy/aws-acm-route53.sh                       # prints ACM_CERT_ARN

# 2) create CloudFront WITH the domain + cert
DOMAIN=shop.example.com ACM_CERT_ARN=<arn> \
S3_WEBSITE_DOMAIN=<bucket>.s3-website-us-east-1.amazonaws.com \
EC2_PUBLIC_DNS=<EC2_PUBLIC_DNS> \
  ./deploy/aws-cloudfront-create.sh                 # prints DISTRIBUTION_ID + CLOUDFRONT_DOMAIN

# 3) point the domain at CloudFront
DOMAIN=shop.example.com HOSTED_ZONE_ID=Z0123456ABCDEF \
CLOUDFRONT_DOMAIN=<dxxxx.cloudfront.net> \
  ./deploy/aws-route53-alias.sh
```

Then open `https://shop.example.com` (DNS propagates in a few minutes).

## 8. CI/CD (GitHub Actions)

[`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) builds and
deploys on every push to `main`: frontend → S3 + CloudFront invalidation;
backend → jar to a private artifacts bucket, then **SSM** tells the EC2 box to
pull it and restart (no SSH, port 22 stays closed).

One-time setup:

```bash
# private artifacts bucket + EC2 instance profile (SSM + artifacts read),
# and attach the profile to the instance:
ARTIFACTS_BUCKET=esy-artifacts-$(openssl rand -hex 3) REGION=us-east-1 \
EC2_INSTANCE_ID=i-0abc... ./deploy/aws-iam-setup.sh
```

Then in the GitHub repo:

- **Secrets**: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (an IAM user limited
  to S3 + CloudFront + SSM + the artifacts bucket).
- **Variables**: `AWS_REGION`, `S3_BUCKET`, `ARTIFACTS_BUCKET`,
  `CLOUDFRONT_DISTRIBUTION_ID`, `EC2_INSTANCE_ID`.

Push to `main` → it builds, ships the frontend, and rolls the backend. The H2
file DB is preserved across backend rolls (`JPA_DDL_AUTO=update`).
(Hardening: swap the access-key secrets for GitHub OIDC + an IAM role later.)

## 9. Notes & teardown

- Back up `/var/lib/esy/esydb.mv.db` periodically (it's your whole DB).
- `JWT_SECRET` lives in `/etc/esy/esy-api.env` (mode 600). Rotate by editing + `systemctl restart esy-api` (invalidates existing tokens).
- For real multi-tenant subdomains / HA, move to RDS + a load balancer (out of free scope).
- **Teardown** (stop all charges): disable+delete the CloudFront distribution, `aws s3 rb s3://<bucket> --force`, terminate the EC2 instance, delete the key pair/SG.
