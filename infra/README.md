# Argos infrastructure (CDK)

## Stacks

| Stack                                 | Region      | What it is                                                                  |
| ------------------------------------- | ----------- | --------------------------------------------------------------------------- |
| `argos-deployment-<stage>`            | `us-east-1` | Customer deployment hosting — `argos-ci.live`. S3 + DynamoDB + Lambda@Edge. |
| `argos-deployment-production-replica` | `eu-west-1` | Cross-region replica bucket for the above.                                  |
| `argos-assets-<stage>`                | `us-east-1` | Argos's **own** frontend assets — `assets.argos-ci.com`. S3 + CloudFront.   |

The two domains are unrelated and easy to confuse. `argos-ci.live` is a Route 53
zone in this account, so the deployment stack creates its own certificate and
DNS records. `argos-ci.com` is **not** in Route 53 — its DNS lives with an
external provider — so the assets stack creates neither, and both records are
made by hand once (see the runbook below).

## Why the assets stack exists

The app runs as several ECS tasks behind an ALB, and each task can only serve
the frontend build baked into its own image. During a rolling deploy the shell
served by a new task names content-hashed chunks the old tasks do not have, so
whichever task answers the asset request may 404 it. Worse, once the old tasks
are gone, any browser tab still holding the old shell can never load another
lazy route — and there are ~40 of them behind `lazy: () => import(...)`.

Both are the same bug: asset lifetime was tied to container lifetime. The assets
stack unties them. Its bucket is **append-only across deploys** — every recent
build's chunks stay reachable no matter which task answers, and rolling back to
an older image keeps working. Space is reclaimed out of band by a daily Lambda,
never by a deploy.

## Where configuration comes from

`scripts/app.ts` takes stack props from one of three sources, chosen with
`-c source=...`:

| `source` | Reads from                               | Used by           |
| -------- | ---------------------------------------- | ----------------- |
| `1P`     | `op://argos-{prod,dev}/cdk/config.json`  | Local, historical |
| `ssm`    | SSM parameter `/<stage>/cdk/config.json` | CI, and local     |
| _unset_  | Individual `-c` context flags            | Throwaway synths  |

The document is the same in all cases:

```jsonc
{
  "stage": "production",
  // argos-ci.live — the customer deployment zone, in Route 53
  "hostedZoneId": "Z0123456789ABCDEFGHIJ",
  "apiBaseUrl": "https://api.argos-ci.com",
  "appUrl": "https://app.argos-ci.com",
  "accessTokenSecret": "…",
  "appUserArns": ["arn:aws:iam::<ACCOUNT_ID>:user/greg"],

  "assets": {
    "domainName": "assets.argos-ci.com",
    // Issued by hand in us-east-1 — see step 2 below
    "certificateArn": "arn:aws:acm:us-east-1:<ACCOUNT_ID>:certificate/…",
    // Every origin the SPA is served from. Module scripts are always fetched
    // in CORS mode, so an origin missing here cannot boot the app at all.
    "allowedOrigins": ["https://app.argos-ci.com"],
    // The role release.yml assumes to sync assets — the existing AWS_ROLE_ARN
    // secret, NOT the new CDK role. Today that is GitHubActionsECRPush; to
    // confirm, list the roles trusting GitHub OIDC and pick the one that is
    // not argos-github-actions-cdk:
    //   aws iam list-roles --query \
    //     'Roles[?contains(to_string(AssumeRolePolicyDocument), `githubusercontent`)].RoleName'
    "uploaderRoleArns": ["arn:aws:iam::<ACCOUNT_ID>:role/GitHubActionsECRPush"],
  },
}
```

> Keeping the 1Password item and the SSM parameter in sync by hand is a
> standing trap. You already need AWS credentials to run `cdk deploy` locally,
> so the simplest fix is to use `-c source=ssm` locally too and let the
> 1Password copy go. The `1P` branch is kept only so nothing breaks mid-migration.

---

## One-time setup runbook

Everything below is done once. Steps 1–6 touch only new resources and change
nothing that is currently serving traffic. **Step 7 is the only irreversible-ish
one**, and it is explained there.

Have `aws` authenticated against the production account first:

```sh
aws sts get-caller-identity
```

Note the `Account` value — it is `<ACCOUNT_ID>` throughout.

### 1. Confirm the account is CDK-bootstrapped

The CDK role created in step 3 has no permissions of its own; it works by
assuming the bootstrap roles. If bootstrap is missing or old, nothing else
works.

```sh
aws ssm get-parameter --name /cdk-bootstrap/hnb659fds/version --region us-east-1 --query Parameter.Value --output text
aws ssm get-parameter --name /cdk-bootstrap/hnb659fds/version --region eu-west-1 --query Parameter.Value --output text
```

Both should print a version number (≥ 21). `us-east-1` carries the deployment
and assets stacks; `eu-west-1` carries the replica stack. A `ParameterNotFound`
means that region was never bootstrapped — run `pnpm --filter @argos/infra exec
cdk bootstrap aws://<ACCOUNT_ID>/<region>` before continuing.

### 2. Issue the certificate for `assets.argos-ci.com`

It **must** be in `us-east-1`: CloudFront only accepts certificates from that
region, whatever region the distribution actually serves from.

```sh
aws acm request-certificate \
  --domain-name assets.argos-ci.com \
  --validation-method DNS \
  --region us-east-1 \
  --query CertificateArn --output text
```

That prints the ARN. Now ask ACM which CNAME proves you own the name:

```sh
aws acm describe-certificate \
  --certificate-arn <CERT_ARN> \
  --region us-east-1 \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord'
```

Create that `Name` → `Value` CNAME at whoever hosts `argos-ci.com` DNS. If that
is Cloudflare, set it to **DNS only** (grey cloud) — a proxied validation record
is rewritten and ACM never sees it.

Then block until it is issued (minutes, occasionally longer):

```sh
aws acm wait certificate-validated --certificate-arn <CERT_ARN> --region us-east-1
```

The certificate is created here rather than by CDK for a specific reason: a
DNS-validated certificate with no Route 53 zone makes CloudFormation sit and
wait for a human to add a record, and eventually time out. Issuing it once out
of band keeps every future `cdk deploy` non-interactive.

### 3. Create the GitHub OIDC role

First check whether the account already trusts GitHub's OIDC provider. It almost
certainly does — `release.yml` already authenticates this way — and creating a
second provider for the same URL fails the stack:

```sh
aws iam list-open-id-connect-providers
```

If `token.actions.githubusercontent.com` appears, leave `CreateOidcProvider` at
its `false` default:

```sh
aws cloudformation deploy \
  --stack-name argos-github-oidc-cdk-role \
  --template-file infra/bootstrap/github-oidc-cdk-role.yml \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1
```

If it does **not** appear, add
`--parameter-overrides CreateOidcProvider=true` to that command.

Read the ARN back out:

```sh
aws cloudformation describe-stacks \
  --stack-name argos-github-oidc-cdk-role \
  --region us-east-1 \
  --query 'Stacks[0].Outputs[?OutputKey==`RoleArn`].OutputValue' --output text
```

Store it as the **`CDK_AWS_ROLE_ARN`** repository secret in GitHub
(Settings → Secrets and variables → Actions).

**What this role can do.** Almost nothing directly. It holds `sts:AssumeRole` on
`cdk-hnb659fds-*` — the bootstrap roles that already carry deploy rights — plus
`ssm:GetParameter` on `*/cdk/config.json` and read-only CloudFormation for
`cdk diff`. So the blast radius is whatever `cdk bootstrap` provisioned, and
revoking CI's access later is deleting this one stack. Trust is scoped to
`refs/heads/main` and same-repo pull requests; fork PRs receive no token at all,
which is why `infra.yml` also gates the diff job on the head repository.

### 4. Publish the config parameter

Write the JSON from [Where configuration comes from](#where-configuration-comes-from)
to a local file — starting from the current 1Password item and adding the
`assets` block — then:

```sh
aws ssm put-parameter \
  --name /production/cdk/config.json \
  --type SecureString \
  --value file://config.json \
  --region us-east-1 \
  --overwrite
```

`SecureString` because the document carries `accessTokenSecret`. The default
`alias/aws/ssm` key is used when `--key-id` is omitted, and its key policy
already allows any principal in the account to decrypt via SSM — so the CDK role
needs no extra `kms:Decrypt`. If you point it at a customer-managed key instead,
you must add that permission to the role.

Delete the local file afterwards.

Verify `app.ts` can read it — this synthesizes without deploying anything:

```sh
pnpm --filter @argos/infra exec cdk synth argos-assets-production -c stage=production -c source=ssm
```

### 5. Deploy the assets stack

Deploy **only** this stack. `--all` would also push any drift in the deployment
stack, which is not what you want on the first CI-adjacent deploy:

```sh
pnpm --filter @argos/infra exec cdk deploy argos-assets-production -c stage=production -c source=ssm
```

Nothing serves yet — the distribution exists but no DNS points at it. Note the
`DistributionDomainName` output (`dxxxxxxxxxxxxx.cloudfront.net`).

### 6. Point DNS at the distribution, and verify

Create `assets.argos-ci.com` → `<DistributionDomainName>` as a CNAME at the
external DNS provider. On Cloudflare, **DNS only** again — proxying would stack a
second CDN in front of CloudFront.

Once it propagates, upload a probe file and fetch it the way a browser will:

```sh
echo 'ok' | aws s3 cp - s3://argos-assets-production/assets/_probe.txt --cache-control "public, max-age=60"
```

```sh
curl -sSI -H 'Origin: https://app.argos-ci.com' https://assets.argos-ci.com/assets/_probe.txt
```

You are looking for three things:

- `HTTP/2 200` — DNS, the certificate and the origin access control all work.
- `access-control-allow-origin: https://app.argos-ci.com` — without this, module
  scripts fail to load even though the file is reachable.
- `cache-control: public, max-age=60` — proves object metadata is passed through.

Then clean up: `aws s3 rm s3://argos-assets-production/assets/_probe.txt`

### 7. Ship the app change

Only now merge the application PR.

This is the step to be careful with, because it is all-or-nothing:
`release.yml` sets `ASSETS_BASE_URL`, so from the first release after merge the
built HTML names `https://assets.argos-ci.com/...` for **every** script and
stylesheet. If the CDN were not live, that is a blank page, not a slow one —
which is exactly why steps 1–6 come first and end in a verification.

Watch the first release: the `assets` job must succeed **before** `deploy`
starts. That ordering is enforced by `needs: [build, migrate, assets]`, and it
is the guarantee that the CDN already holds the chunks the new shell names.

**Backing out** does not require undoing any of the above. Remove
`ASSETS_BASE_URL` from `release.yml` and release again: assets go back to being
served from the app origin, because the container never stopped serving
`apps/frontend/dist`. The bucket and distribution can stay up, unused.

---

## Day to day

- **Changing infra:** open a PR touching `infra/**`. `infra.yml` runs `cdk diff`
  against the live stacks and prints it in the job log. Merging to `main` runs
  `cdk deploy --all`.
- **Deploying by hand:** `pnpm --filter @argos/infra exec cdk deploy <stack> -c stage=production -c source=ssm`
- **Changing config:** update the SSM parameter (step 4), then redeploy. Config
  is read at synth time, so a parameter change alone does nothing.

## Asset retention

Each release writes `manifests/<sha>.json` listing the keys it published. A
daily Lambda keeps the union of every manifest newer than 30 days and deletes
the rest.

It is deliberately **not** an S3 lifecycle rule. A chunk whose content is
unchanged keeps the same hash across builds, so `aws s3 sync` skips re-uploading
it and its S3 creation date never moves — a lifecycle rule would expire files
that today's HTML still references. Retention has to follow the age of the build
that last named a key, not the age of the object.

Two guards make it safe to run unattended, both covered by tests in
`lambda/purge-assets.test.ts`:

- If no manifest falls inside the window, it deletes nothing. An empty keep-set
  means "delete everything", and a listing failure is likelier than a genuinely
  idle month.
- It never deletes an object younger than a day. A release uploads its assets
  and _then_ writes its manifest; in that window the new chunks are referenced
  by nothing.

## Troubleshooting

**`Command "esbuild" not found` during synth or diff.** `NodejsFunction`
bundles by shelling out to `pnpm exec -- esbuild`, and it does so from the
**repository root**, because that is where the lockfile is. So `esbuild` is a
root `devDependency` even though only `infra/` uses it — declaring it in
`infra/package.json` would not put it on the path where CDK actually invokes it,
since `pnpm exec` searches upward, not downward. It is in knip's
`ignoreDependencies` for the same reason: nothing imports it, CDK spawns it.

**`cdk diff` fails on credentials in a PR.** Expected for fork PRs — they get no
OIDC token. The job is gated to same-repo PRs; a fork's infra change has to be
diffed by a maintainer.

**`Need to perform AWS calls but no credentials configured`.** The
`CDK_AWS_ROLE_ARN` secret is missing or the trust policy does not match. The
`sub` claim must be `repo:argos-ci/argos:ref:refs/heads/main` or
`repo:argos-ci/argos:pull_request`.

**Assets 404 from the CDN but exist in the bucket.** Under origin access control
the bucket grants only `s3:GetObject`, so S3 answers a _missing_ key with 403
rather than 404. A 403 here means the key is absent, not that permissions are
wrong.

**Browser reports a MIME type error for a script.** The app origin returns
`index.html` for unmatched paths. `app-router.ts` now 404s `/assets/*`
explicitly, so this should mean the CDN is not being used at all — check that
`ASSETS_BASE_URL` was set at image build time, not just at runtime.
