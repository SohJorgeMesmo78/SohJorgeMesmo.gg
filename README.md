# SohJorgeMesmoGg

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.1.7.

## Development server

To start a local Angular development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## YouTube API and Vercel local testing

This project includes a server-side YouTube endpoint at `/api/youtube`.

For local development with Vercel Functions, copy the example file and add the real value:

```bash
cp .env.local.example .env.local
```

Then set your key:

```env
YOUTUBE_API_KEY=your_youtube_api_key_here
```

If you want to test the Vercel Function behavior locally, use:

```bash
npx vercel dev
```

This executes the serverless function route at `http://localhost:3000/api/youtube` and is the recommended workflow for verifying the same behavior used in production on Vercel.

> `ng serve` does not automatically run Vercel Functions, so the recommended local check for the API route is `npx vercel dev`.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
