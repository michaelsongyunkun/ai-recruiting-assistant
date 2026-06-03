# AI Recruiting Assistant

AI Recruiting Assistant is a local-first recruiting workflow app for HR teams and hiring managers. It helps teams manage product role hiring from job setup to resume parsing, resume scoring, interview guide generation, interview scoring, and final result review.

The app is designed for enterprise use: restrained UI, auditable workflows, user-owned model credentials, and human review as the final decision point.

## Features

- Job setup with role-specific scoring criteria.
- Candidate import and resume upload workflow.
- DeepSeek-compatible resume parsing through a configured model API.
- Product manager resume scoring agent based on structured rubrics.
- Hiring manager interview guide agent with weighted scoring rules.
- Interview result calculation with HR-configurable resume/interview weights.
- Compliance-oriented audit and fairness support.

## Model API Requirement

Generation features require a user-provided model API key. The app does not use a built-in demo key or hidden platform fallback. Configure your enterprise model connection from:

```text
/settings/model-api
```

For DeepSeek, use an OpenAI-compatible connection and provide your own API base URL, model name, and API key.

## Getting Started

Install dependencies:

```bash
npm install
```

Create local environment config:

```bash
cp .env.example .env
```

Start the development server:

```bash
npm run dev
```

On Windows, `npm.cmd run dev` is also supported.

## Local Verification

Run tests:

```bash
npm run test
```

Build the app:

```bash
npm run build
```

## Responsible Use

This product assists HR and interviewers with structured review. Resume scores, interview scores, and recommendations are for human reference only and must not be used as the sole basis for hiring, rejection, or other employment decisions.

## License

MIT
