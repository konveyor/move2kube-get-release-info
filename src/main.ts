import * as core from "@actions/core";
import { Octokit } from "@octokit/rest";
import { get_release_info } from "./utils";
import * as github from "@actions/github";

async function main(): Promise<void> {
  const token: string = core.getInput("token");
  const owner: string = core.getInput("owner") || github.context.repo.owner;
  const repo: string = core.getInput("repo") || github.context.repo.repo;
  const octokit: Octokit = new Octokit(token ? { auth: token } : {});
  const release_info = await get_release_info(owner, repo, octokit);
  core.setOutput("release_info", JSON.stringify(release_info, null, 4));
}

async function run(): Promise<void> {
  try {
    await main();
  } catch (error) {
    return core.setFailed(error.message);
  }
}

run();
