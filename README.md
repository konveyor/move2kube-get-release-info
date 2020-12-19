# get-release-info

Github action for getting release information.  
Outputs useful information like current version, next version and next next version  
useful for calculating tag, commit, etc. to use for the next release.

## Usage

```
steps:
  - id: info
    uses: konveyor/get-release-info@v1
    with:
      owner: "owner"
      repo: "repo"
  - run: echo '${{ steps.info.outputs.release_info }}'
```

## Action Inputs

| Name | Description | Required |
| --- | --- | --- |
| `owner` | Owner of the repo. | False. Defaults to current owner. |
| `repo` | Name of the repo. | False. Defaults to current repo. |
| `token` | Token should be ${{ secrets.GITHUB_TOKEN }} | False. Defaults to no token. Makes unauthenticated requests. |

## Action Outputs

| Name | Description |
| --- | --- |
| `release_info` | JSON object with all of the release information. |

`release_info` has the following structure:
```
{
  current: {
    release: string | null;
    release_url: string | null;
    prerelease: string | null;
    prerelease_url: string | null;
  };
  next: { prerelease: string | null; prerelease_url: string | null };
  next_next: { prerelease: string | null; prerelease_url: string | null };
  next_release_is_minor: boolean;
  next_next_release_is_minor: boolean;
};
```
