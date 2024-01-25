import * as core from '@actions/core';

export interface ActionInputs {
  workingDirectory: string;
  commentStrategy: 'always' | 'skip-insignificant';
  githubToken: string;
}

export function getInputs(): ActionInputs {
  const workingDirectory = core.getInput('working-directory');
  const commentStrategy = core.getInput('comment-strategy');
  const githubToken = core.getInput('github-token');

  const inputs = {
    workingDirectory,
    commentStrategy: commentStrategy === 'skip-insignificant' ? 'skip-insignificant' : 'always',
    githubToken,
  } satisfies ActionInputs;

  return inputs;
}
