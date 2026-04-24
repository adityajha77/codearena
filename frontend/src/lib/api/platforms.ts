export interface PlatformStats {
  platform: string;
  handle: string;
  connected: boolean;
  stats: string;
  valid: boolean;
}

export type ActivityMap = Record<string, number>;

// Helper to convert dates to YYYY-MM-DD in local timezone
export const toDateString = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const verifyGitHub = async (handle: string): Promise<PlatformStats> => {
  try {
    const res = await fetch(`https://api.github.com/users/${handle}`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    return { platform: "GitHub", handle, connected: true, valid: true, stats: `${data.public_repos} repos` };
  } catch {
    return { platform: "GitHub", handle, connected: false, valid: false, stats: "—" };
  }
};

export const getGitHubActivity = async (handle: string): Promise<ActivityMap> => {
    try {
        // A common public proxy for Github Contributions
        const res = await fetch(`https://github-contributions-api.jasonwoodward.com/user/${handle}`);
        const data = await res.json();
        const map: ActivityMap = {};
        if (data && data.contributions) {
            data.contributions.forEach((c: any) => {
                map[c.date] = c.count;
            });
        }
        return map;
    } catch {
        return {};
    }
}

export const verifyLeetCode = async (handle: string): Promise<PlatformStats> => {
  try {
    const url = `https://leetcode-stats-api.herokuapp.com/${handle}`;
    const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
    const data = await res.json();
    if (data.status === "error") throw new Error();
    return { platform: "LeetCode", handle, connected: true, valid: true, stats: `${data.totalSolved} problems` };
  } catch {
    return { platform: "LeetCode", handle, connected: false, valid: false, stats: "—" };
  }
};

export const getLeetCodeActivity = async (handle: string): Promise<ActivityMap> => {
    try {
        const url = `https://leetcode-stats-api.herokuapp.com/${handle}`;
        const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
        const data = await res.json();
        const map: ActivityMap = {};
        if (data && data.submissionCalendar) {
            for (const [timestamp, count] of Object.entries(data.submissionCalendar)) {
                // LeetCode returns unix timestamps as keys
                const date = new Date(parseInt(timestamp) * 1000);
                map[toDateString(date)] = (map[toDateString(date)] || 0) + (count as number);
            }
        }
        return map;
    } catch {
        return {};
    }
}

export const verifyCodeforces = async (handle: string): Promise<PlatformStats> => {
  try {
    const res = await fetch(`https://codeforces.com/api/user.info?handles=${handle}`);
    const data = await res.json();
    if (data.status !== "OK") throw new Error();
    const user = data.result[0];
    return { platform: "Codeforces", handle, connected: true, valid: true, stats: `Rating: ${user.rating || 'Unrated'}` };
  } catch {
    return { platform: "Codeforces", handle, connected: false, valid: false, stats: "—" };
  }
};

export const getCodeforcesActivity = async (handle: string): Promise<ActivityMap> => {
    try {
        const res = await fetch(`https://codeforces.com/api/user.status?handle=${handle}`);
        const data = await res.json();
        const map: ActivityMap = {};
        if (data.status === "OK" && data.result) {
            data.result.forEach((submission: any) => {
                if (submission.creationTimeSeconds && submission.verdict === "OK") {
                    const date = new Date(submission.creationTimeSeconds * 1000);
                    map[toDateString(date)] = (map[toDateString(date)] || 0) + 1;
                }
            });
        }
        return map;
    } catch {
        return {};
    }
}

export const fetchAggregatedActivity = async (
    github: string | null, 
    leetcode: string | null, 
    codeforces: string | null
): Promise<ActivityMap> => {
    const aggregated: ActivityMap = {};
    const promises = [];
    if (github) promises.push(getGitHubActivity(github));
    if (leetcode) promises.push(getLeetCodeActivity(leetcode));
    if (codeforces) promises.push(getCodeforcesActivity(codeforces));
    
    const results = await Promise.all(promises);
    for (const res of results) {
        for (const [date, count] of Object.entries(res)) {
            aggregated[date] = (aggregated[date] || 0) + (count as number);
        }
    }
    return aggregated;
}



export const checkActivityToday = async (platform: string, handle: string): Promise<boolean> => {
  const today = toDateString(new Date());
  
  try {
      if (platform === "GitHub") {
          const res = await fetch(`https://api.github.com/users/${handle}/events/public`);
          if (!res.ok) return false;
          
          const events = await res.json();
          const hasActivityToday = events.some((event: any) => {
            if (!event.created_at) return false;
            const eventDate = new Date(event.created_at);
            return toDateString(eventDate) === today;
          });
          
          return hasActivityToday;
      }
      if (platform === "LeetCode") {
          const acts = await getLeetCodeActivity(handle);
          return (acts[today] || 0) > 0;
      }
      if (platform === "Codeforces") {
          const acts = await getCodeforcesActivity(handle);
          return (acts[today] || 0) > 0;
      }

  } catch (error) {
      console.error("Checking activity failed:", error);
  }
  return false;
};
