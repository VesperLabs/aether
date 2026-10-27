import type { UserConfig } from "@commitlint/types";

/** Conventional commits, so release-please can read every commit (see .github/workflows/release-deploy.yml). */
const config: UserConfig = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    /* Commit bodies here are prose and often have long lines or URLs. */
    "body-max-line-length": [0],
    "footer-max-line-length": [0],
  },
};

export default config;
