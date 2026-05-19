export interface GitHubRelease {
  name: string;
  publishedAt: Date;
  htmlUrl: string;
  body: string;
}

export interface GitHubCommit {
  sha: string;
  timestamp: Date;
}

const githubApi = 'https://api.github.com';

export class GitHub {
  static async getReleases(owner: string, repo: string, offset = 0, limit = 30): Promise<GitHubRelease[]> {
    const page = Math.floor(offset / limit) + 1;
    const response = await fetch(`${githubApi}/repos/${owner}/${repo}/releases?per_page=${limit}&page=${page}`);

    if (!response.ok) {
      throw new Error(`Could not fetch GitHub releases for ${owner}/${repo}`);
    }

    return (await response.json()).map((release: Record<string, string>) => ({
      name: release.name || release.tag_name,
      publishedAt: new Date(release.published_at),
      htmlUrl: release.html_url,
      body: release.body,
    }));
  }

  static async getNewestCommit(owner: string, repo: string, branch: string): Promise<GitHubCommit> {
    const response = await fetch(`${githubApi}/repos/${owner}/${repo}/commits/${branch}`);

    if (!response.ok) {
      throw new Error(`Could not fetch GitHub commit for ${owner}/${repo}@${branch}`);
    }

    const commit = await response.json();

    return {
      sha: commit.sha,
      timestamp: new Date(commit.commit.committer.date),
    };
  }
}
