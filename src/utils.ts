import * as semver from "semver";
import * as core from "@actions/core";
import { Octokit } from "@octokit/rest";
import { Endpoints } from "@octokit/types";

export {
  get_all_tags,
  get_major_minor_patch,
  get_release_info_without_urls,
  get_release_info,
};

type listTagsRespT = Endpoints["GET /repos/{owner}/{repo}/tags"]["response"];
type tagsT = listTagsRespT["data"][0];
type releaseInfoT = {
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

async function get_all_tags(
  owner: string,
  repo: string,
  octokit: Octokit | null = null,
  max_tags = 40
): Promise<tagsT[]> {
  core.debug("get_all_tags");
  const tags: tagsT[] = [];
  if (!octokit) {
    octokit = new Octokit();
  }
  try {
    for (let page = 1; tags.length < max_tags; page++) {
      const resp: listTagsRespT = await octokit.repos.listTags({
        owner,
        repo,
        per_page: 100, // github returns a max of 100 tags at a time.
        page,
      });
      if (resp.data.length === 0) {
        core.debug(`stopping because we got no results for page ${page}`);
        return tags;
      }
      tags.push(...resp.data);
    }
    core.debug(
      `stopping because we hit the max number of tags. max: ${max_tags} got: ${tags.length}`
    );
    return tags;
  } catch (err) {
    core.info(`stopping because an error occurred. error: ${err}`);
    return tags;
  }
}

function get_major_minor_patch(v: string): string {
  core.debug("get_major_minor_patch");
  const x = semver.parse(v);
  return x !== null ? `${x.major}.${x.minor}.${x.patch}` : "";
}

async function get_release_info_without_urls(
  owner: string,
  repo: string,
  octokit: Octokit | null = null
): Promise<releaseInfoT> {
  core.debug("get_release_info_without_urls");
  /*
        assume that there is already at least one release and corresponding prerelease so release_info.current will not have nulls
        assume alpha -> beta -> rc -> release progression
    */
  const release_info: releaseInfoT = {
    current: {
      release: null,
      release_url: null,
      prerelease: null,
      prerelease_url: null,
    },
    next: { prerelease: null, prerelease_url: null },
    next_next: { prerelease: null, prerelease_url: null },
    next_release_is_minor: false,
    next_next_release_is_minor: false,
  };

  const tags = await get_all_tags(owner, repo, octokit);
  const valid_tags = tags.map((x) => x.name).filter((x) => semver.valid(x));
  if (valid_tags.length === 0) {
    core.info(
      "stopping because we did not find any valid semantic version tags"
    );
    return release_info;
  }
  //valid_tags.push('v1.21.0-beta.0', 'v1.22.0-alpha.4') // for testing
  const sorted_tags = valid_tags.sort(semver.rcompare);

  const releases = sorted_tags.filter((x) => semver.prerelease(x) === null);
  const prereleases = sorted_tags.filter((x) => semver.prerelease(x) !== null);

  if (releases.length === 0) {
    if (prereleases.length > 0) {
      release_info.current.prerelease = prereleases[0];
    }
    core.info("stopping because there are no releases");
    return release_info;
  }
  const current_release = releases[0];
  release_info.current.release = current_release;

  if (prereleases.length === 0) {
    core.info("stopping because there are no prereleases");
    return release_info;
  }

  const current_release_obj: semver.SemVer = semver.parse(current_release)!; // ! is the type assertion for not null
  const major_minor_prereleases = prereleases.filter(
    (x) =>
      semver.major(x) === current_release_obj.major &&
      semver.minor(x) === current_release_obj.minor
  );
  if (major_minor_prereleases.length === 0) {
    core.info(
      "stopping because there are no prereleases with the same major and minor version as the latest release"
    );
    return release_info;
  }
  const latest_prerelease_on_current_release_branch =
    major_minor_prereleases[0];
  release_info.current.prerelease = latest_prerelease_on_current_release_branch;

  const prereleases_after_current_release = prereleases.filter((x) =>
    semver.gt(x, current_release)
  );
  if (prereleases_after_current_release.length === 0) {
    core.info(
      "stopping because there are no prereleases after current version"
    );
    return release_info;
  }

  const next_minor = semver.minor(semver.inc(current_release, "minor")!);
  const next_major = semver.major(semver.inc(current_release, "major")!);
  const next_minor_prereleases = prereleases_after_current_release.filter(
    (x) =>
      semver.major(x) === semver.major(current_release) &&
      semver.minor(x) === next_minor
  );
  const next_major_prereleases = prereleases_after_current_release.filter(
    (x) => semver.major(x) === next_major
  );

  if (
    next_minor_prereleases.length === 0 &&
    next_major_prereleases.length === 0
  ) {
    core.info("stopping because next release is neither minor nor major");
    return release_info;
  }

  release_info.next_release_is_minor = next_minor_prereleases.length > 0;
  const next_prerelease =
    next_minor_prereleases.length > 0
      ? next_minor_prereleases[0]
      : next_major_prereleases[0];
  release_info.next.prerelease = next_prerelease;

  const next_next_minor = semver.minor(
    semver.inc(get_major_minor_patch(next_prerelease), "minor")!
  );
  const next_next_major = semver.major(
    semver.inc(get_major_minor_patch(next_prerelease), "major")!
  );
  const next_next_minor_prereleases = prereleases_after_current_release.filter(
    (x) =>
      semver.major(x) === semver.major(current_release) &&
      semver.minor(x) === next_next_minor
  );
  const next_next_major_prereleases = prereleases_after_current_release.filter(
    (x) => semver.major(x) === next_next_major
  );

  if (
    next_next_minor_prereleases.length === 0 &&
    next_next_major_prereleases.length === 0
  ) {
    core.info("stopping because there are no prereleases after next version");
    return release_info;
  }

  release_info.next_next_release_is_minor =
    next_next_minor_prereleases.length > 0;
  release_info.next_next.prerelease =
    next_next_minor_prereleases.length > 0
      ? next_next_minor_prereleases[0]
      : next_next_major_prereleases[0];

  return release_info;
}

async function get_release_info(
  owner: string,
  repo: string,
  octokit: Octokit | null = null
): Promise<releaseInfoT> {
  core.debug("get_release_info");
  if (!octokit) {
    octokit = new Octokit();
  }
  const data = await get_release_info_without_urls(owner, repo, octokit);
  const get_release_url = async (
    tag: string | null
  ): Promise<string | null> => {
    if (tag === null) return null;
    try {
      const resp = await octokit!.repos.getReleaseByTag({
        owner,
        repo,
        tag,
      });
      return resp.data.html_url;
    } catch (err) {
      core.debug(
        `error occurred while fetching the (pre)release for tag ${tag} error: ${err}`
      );
    }
    return null;
  };
  data.current.release_url = await get_release_url(data.current.release);
  data.current.prerelease_url = await get_release_url(data.current.prerelease);
  data.next.prerelease_url = await get_release_url(data.next.prerelease);
  data.next_next.prerelease_url = await get_release_url(
    data.next_next.prerelease
  );
  return data;
}
