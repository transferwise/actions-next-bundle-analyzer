# actions-next-bundle-analyzer

GitHub action that analyses the bundle sizes for each page in a Next.js build.

## Usage

Add the following step to a workflow, after the Next.js project has been built (i.e. after running `yarn build`).

```yml
- name: Analyze bundle sizes
  uses: transferwise/actions-next-bundle-analyzer@master
  with:
    # Optional, defaults to master
    default-branch: master
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

When the job runs on a pull request a comment will be added showing the bundle sizes of the branch and the difference against master.

_Note: Difference to master will only be shown once this action has run on a master commit._

## Contributing

Compiled files must also be commited. After making changes to TypeScript files run

```
yarn build
```

Add both the source files and the new compiled files to your pull request.
