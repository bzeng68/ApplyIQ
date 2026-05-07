# Bootstrap: Terraform State Bucket

This directory creates the GCS bucket that will store Terraform state for the main ApplyIQ infrastructure.

**Run this ONCE manually before running `terraform/main/`.**

## Steps

1. Ensure you're authenticated with GCP:
   ```bash
   gcloud auth application-default login
   ```

2. Navigate to this directory:
   ```bash
   cd terraform/bootstrap
   ```

3. Initialize Terraform (uses local state initially):
   ```bash
   terraform init
   ```

4. Create `terraform.tfvars` with your values:
   ```bash
   cat > terraform.tfvars <<EOF
   project_id = "apply-iq-495519"
   org_id     = "1092146854014"
   EOF
   ```

5. Review the plan:
   ```bash
   terraform plan
   ```

6. Apply to create the state bucket:
   ```bash
   terraform apply
   ```

   This will output:
   - `terraform_state_bucket`: the name of the GCS bucket created
   - `project_id`: your project ID

7. After successful apply, you can now proceed to `terraform/main/`.

## What This Creates

- `applyiq-terraform-state-apply-iq-495519` — GCS bucket for Terraform state with versioning and lock support
- Enables all required GCP APIs for the main infrastructure

## Cleanup (if needed)

To destroy the state bucket:
```bash
terraform destroy
```

**Warning:** This will delete the state bucket. Only do this if you're completely removing the ApplyIQ infrastructure.
