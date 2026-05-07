# ApplyIQ Terraform (main)

## Init

1. Copy `terraform.tfvars.example` to `terraform.tfvars` and fill values.
2. Initialize backend:
   - `terraform init -backend-config="bucket=applyiq-tfstate-YOUR_PROJECT" -backend-config="prefix=applyiq/main"`
3. Plan + apply:
   - `terraform plan`
   - `terraform apply`

## Manual steps

- Configure the IAP OAuth consent screen once in the Cloud Console.
- Add GitHub repo secrets for Workload Identity Federation outputs.
