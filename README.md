# KRM Consulting website

Static brochure-site preview for KRM Consulting. It uses plain HTML, CSS and JavaScript, with no runtime dependencies or CMS.

## Preview limitations

- The enquiry form is a visual demo only. It does not transmit or store submissions.
- The three videos are clearly labelled external Google customer stories used to demonstrate the testimonial layout. They are not KRM testimonials and must be replaced before launch.
- The deployment is intentionally `noindex`. The existing Wix site and `krmconsulting.com.au` remain unchanged.

## Local checks

Use Node.js 20 or newer:

```sh
npm test
npm run build
```

Open `index.html` directly or serve the directory with any static file server.

## Delivery

The source repository is [ExIQAI/krm-consulting](https://github.com/ExIQAI/krm-consulting). Pushes to `main` deploy through the repository's native Vercel Git connection; branches and pull requests receive preview deployments. No custom CI workflow or committed Vercel credentials are required.

The live Wix site stays in place until KRM approves the preview, supplies genuine testimonial videos and explicitly schedules a domain cutover.

All rights reserved.
