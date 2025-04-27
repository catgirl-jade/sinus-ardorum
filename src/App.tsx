
import { useEffect, useState } from "react";
import Papa from "papaparse";

// Represents a job class in the game
interface ClassJob {
  id: number;
  abbreviation: string;
  name: string;
}

// Represents rewards for completing a mission
interface MissionReward {
  id: number;
  cosmocredits: number;
  lunarcredits: number;
  researchRewards: {
    [type: number]: number;
  };
}

// Represents a mission with all relevant display data
interface MissionDisplay {
  id: number;
  name: string;
  cosmocredits: number;
  lunarcredits: number;
  research1: number;
  research2: number;
  research3: number;
  research4: number;
  jobAbbreviation: string;
  missionClass: number;
  isCritical: boolean;
}

// Represents research values for different tiers and levels
interface ResearchValues {
  required: {
    [tier: string]: number[];
  };
  max: {
    [tier: string]: number[];
  };
}

function DataRate({ levels, setDataRate }: {
  levels: { [key: string]: number },
  setDataRate: React.Dispatch<React.SetStateAction<number>>,
}) {
  // Array of data analysis rates based on completed research levels
  const dataRates = [0, 50, 50, 100, 100, 150, 150, 150, 150, 150, 150, 150];
  
  // Count how many research tiers are at level 9
  const completedTiers = Object.values(levels).filter(level => level >= 9).length;
  
  // Get the corresponding data rate
  const rate = dataRates[completedTiers] || 0;
  setDataRate(rate); 
  return (
    <div className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white p-1 mb-6 rounded-sm shadow-md">
      <div className="flex justify-between items-center">
        <div className="text-lg font-semibold">
          Rate of novice level data analysis: <span className="text-xl font-bold">{rate}%</span>
        </div>
      </div>
    </div>
  );
}

function Tabs({ jobs, activeJob, setActiveJob }: { jobs: string[], activeJob: string, setActiveJob: (job: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {jobs.map((abbr) => (
        <button
          key={abbr}
          onClick={() => setActiveJob(abbr)}
          className={`px-4 py-2 rounded ${activeJob === abbr ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}
        >
          {abbr}
        </button>
      ))}
    </div>
  );
}



function MissionTable({
  missions,
  activeJob,
  unlockedTiers,
  researchValues,
  level,
  research,
  missionProgress,
  setMissionProgress,
  dataRate
}: {
  missions: MissionDisplay[],
  activeJob: string,
  unlockedTiers: string[],
  researchValues: ResearchValues | null,
  level: number,
  research: { [key: string]: number },
  missionProgress: { [key: string]: { rank: string; time: number } },
  setMissionProgress: React.Dispatch<React.SetStateAction<{ [key: string]: { rank: string; time: number } }>>,
  dataRate: number,
}) {
  if (!researchValues) return null;
  const remainingRequired: { [key: string]: number } = {};
  const remainingMax: { [key: string]: number } = {};
  const tiers = ['I', 'II', 'III', 'IV'];

  for (const tier of tiers) {
    const req = researchValues.required[tier][level - 1] || 0;
    const maxVal = researchValues.max[tier][level - 1] || 0;
    const current = research[tier] || 0;
    remainingRequired[tier] = Math.max(req - current, 0);
    remainingMax[tier] = Math.max(Math.min(maxVal - current, maxVal - req), 0);
  }

  const maxRemainingRequired = Math.max(...Object.values(remainingRequired), 1);
  const maxRemainingMax = Math.max(...Object.values(remainingMax), 1);

  const totalImportance: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0 };

  for (let i = 0; i < 4; i++) {
    const tier = tiers[i];
    const importanceRequired = remainingRequired[tier] / maxRemainingRequired;
    const importanceMax = remainingMax[tier] / maxRemainingMax;
    totalImportance[i + 1] = importanceRequired + 0.05 * importanceMax;
  }

  const missionClassMap: { [key: number]: string } = {
    1: "D",
    2: "C",
    3: "B",
    4: "A-1",
    5: "A-2",
    6: "A-3",
  };
  const circledArrow = "⮯";

  const missionsWithScores = missions.map((m, _) => {
    const progress = missionProgress[m.id] || { rank: "bronze", time: 1 };
    const multipliers: { [key: string]: number } = { none: 0, bronze: 1, silver: 4, gold: 5 };
    const bonus = multipliers[progress.rank] ?? 1;

    const r1 = m.isCritical ? m.research1 : Math.min(m.research1 * bonus * ((100+dataRate) / 100), remainingRequired['I'] + remainingMax['I']);
    const r2 = m.isCritical ? m.research2 : Math.min(m.research2 * bonus * ((100+dataRate) / 100), remainingRequired['III'] + remainingMax['II']);
    const r3 = m.isCritical ? m.research3 : Math.min(m.research3 * bonus * ((100+dataRate) / 100), remainingRequired['III'] + remainingMax['III']);
    const r4 = m.isCritical ? m.research4 : Math.min(m.research4 * bonus * ((100+dataRate) / 100), remainingRequired['IV'] + remainingMax['IV']);

    const score = r1 * totalImportance[1] + r2 * totalImportance[2] + r3 * totalImportance[3] + r4 * totalImportance[4];
    const scorePerSecond = score / progress.time;
    return { mission: m, score, r1, r2, r3, r4, progress, scorePerSecond };
  }).sort((a, b) => {
    // First prioritize missions with time != 1
    if (a.progress.time !== 1 && b.progress.time === 1) return -1;
    if (a.progress.time === 1 && b.progress.time !== 1) return 1;
    
    // Then sort by scorePerSecond
    return b.scorePerSecond - a.scorePerSecond;
  });
  
  return (
    <div className="overflow-x-auto w-4/5">
      <table className="min-w-full bg-white border">
        <thead>
          <tr>
            <th className="border p-2">Class</th>
            <th className="border p-2">Name</th>
            <th className="border p-2">Cosmocredits</th>
            <th className="border p-2">Lunar Credits</th>
            {unlockedTiers.includes('I') && <th className="border p-2">Cosmic {activeJob} I</th>}
            {unlockedTiers.includes('II') && <th className="border p-2">Cosmic {activeJob} II</th>}
            {unlockedTiers.includes('III') && <th className="border p-2">Cosmic {activeJob} III</th>}
            {unlockedTiers.includes('IV') && <th className="border p-2">Cosmic {activeJob} IV</th>}
            <th className="border p-2">Rank</th>
            <th className="border p-2">Time</th>
            <th className="border p-2">Score</th>
            <th className="border p-2">Score/s</th>
          </tr>
        </thead>
        <tbody>
          {missionsWithScores.map(({ mission, score, r1, r2, r3, r4, progress, scorePerSecond }, _) => (
            <tr key={mission.id}>
              <td className="border p-2">{mission.isCritical ? "Critical" : missionClassMap[mission.missionClass] || ""}</td>
              <td className="border p-2">{mission.name.replace("", circledArrow)}</td>
              <td className="border p-2">{mission.cosmocredits}</td>
              <td className="border p-2">{mission.lunarcredits}</td>
              {unlockedTiers.includes('I') && (
                <td className="border p-2">
                  {mission.research1}{mission.research1 != r1 && ` (${r1})`}
                </td>
              )}
              {unlockedTiers.includes('II') && (
                <td className="border p-2">
                  {mission.research2}{mission.research2 != r2 && ` (${r2})`}
                </td>
              )}
              {unlockedTiers.includes('III') && (
                <td className="border p-2">
                  {mission.research3}{mission.research3 != r3 && ` (${r3})`}
                </td>
              )}
              {unlockedTiers.includes('IV') && (
                <td className="border p-2">
                  {mission.research4}{mission.research4 != r4 && ` (${r4})`}
                </td>
              )}
              <td className={`border p-2 ${
                progress.rank === 'gold' ? 'bg-yellow-100' : 
                progress.rank === 'silver' ? 'bg-gray-200' : 
                progress.rank === 'bronze' ? 'bg-amber-100' : 
                'bg-white'
              }`}>
              <select
                  value={progress.rank}
                  onChange={(e) =>{
                    setMissionProgress(prev => ({
                      ...prev,
                      [mission.id]: { ...(prev[mission.id] || { rank: 'bronze', time: 1 }), rank: e.target.value }
                    }));
                  }}
                >
                  <option value="none">None</option>
                  <option value="bronze">Bronze</option>
                  <option value="silver">Silver</option>
                  <option value="gold">Gold</option>
                </select>
              </td>
              <td className="border p-2">
                <input
                  type="number"
                  value={progress.time}
                  onChange={(e) =>
                    setMissionProgress(prev => ({
                      ...prev,
                      [mission.id]: { ...prev[mission.id], time: Number(e.target.value) }
                    }))
                  }
                  className="border rounded p-1 w-16"
                />
              </td>
              <td className="border p-2">{score.toFixed(3)}</td>
              <td className="border p-2">{scorePerSecond.toFixed(3)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResearchSummary({
  activeJob,
  researchValues,
  level,
  setLevel,
  research,
  setResearch,
}: {
  activeJob: string,
  researchValues: ResearchValues | null,
  level: number,
  setLevel: (level: number) => void,
  research: { [key: string]: number },
  setResearch: (val: { [key: string]: number }) => void,
}) {
  const handleCurrentChange = (tier: string, value: string) => {
    const numericValue = Number(value);
    const newResearch = { ...research, [tier]: numericValue };
    setResearch(newResearch); // triggers outer update
  };

  if (!researchValues) return null;

  return (
    <div className="w-1/5 pr-4">
      <div className="mb-4">
        <label className="block mb-2 font-bold">Current Level</label>
        <input
          type="number"
          min={1}
          max={9}
          value={level}
          onChange={(e) => {
            setLevel(Number(e.target.value));
          }}
          className="w-full p-2 border rounded"
        />
      </div>
      <table className="bg-white border min-w-full">
        <thead>
          <tr>
            <th className="border p-2">Dataset</th>
            <th className="border p-2">Current</th>
            <th className="border p-2">Required</th>
            <th className="border p-2">Max</th>
          </tr>
        </thead>
        <tbody>
          {['I', 'II', 'III', 'IV'].map((tier) => {
            const required = researchValues.required[tier][level - 1] || 0;
            const max = researchValues.max[tier][level - 1] || 0;
            if (required === 0 && max === 0) return null;
            const current = research[tier] || 0;
            const completed = current >= required && required > 0;
            return (
              <tr key={tier} className={completed ? "bg-green-100" : ""}>
                <td className="border p-2">Cosmic {activeJob} {tier}</td>
                <td className="border p-2">
                  <input
                    type="number"
                    value={current}
                    onChange={(e) => handleCurrentChange(tier, e.target.value)}
                    className="w-16 p-1 border rounded"
                  />
                </td>
                <td className="border p-2">{required}</td>
                <td className="border p-2">{max}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}


async function fetchCsv(path: string) {
  const response = await fetch(`${import.meta.env.BASE_URL}${path}`);
  const text = await response.text();
  const { data } = Papa.parse<string[]>(text, {
    skipEmptyLines: true,
    quoteChar: '"',
    escapeChar: '"',
  });
  return data.slice(3);
}

function parseClassJobs(data: string[][]) {
  const map = new Map<number, ClassJob>();
  for (const row of data) {
    if (Number(row[9]) >= 0) {
      const id = Number(row[0]);
      const abbreviation = row[2];
      const name = row[30];
      map.set(id, { id, abbreviation, name });
    }
  }
  return map;
}

function parseMissionRewards(data: string[][]) {
  const map = new Map<number, MissionReward>();
  for (const row of data) {
    const id = Number(row[0]);
    const cosmocredits = Number(row[4]) || 0;
    const lunarcredits = Number(row[5]) || 0;
    const researchRewards: { [type: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0 };
    const pairs = [
      [Number(row[8]), Number(row[9])],
      [Number(row[11]), Number(row[12])],
      [Number(row[14]), Number(row[15])],
    ];
    for (const [type, qty] of pairs) {
      if (type >= 1 && type <= 4 && !isNaN(qty)) {
        researchRewards[type] += qty;
      }
    }
    map.set(id, { id, cosmocredits, lunarcredits, researchRewards });
  }
  return map;
}

function parseCosmoToolData(data: string[][]): ResearchValues {
  const lastRow = data[data.length - 1];
  const required: { [tier: string]: number[] } = { I: [], II: [], III: [], IV: [] };
  const max: { [tier: string]: number[] } = { I: [], II: [], III: [], IV: [] };

  const tiers = ['I', 'II', 'III', 'IV'];
  for (let i = 0; i < 4; i++) {
    const requiredStart = 2 + i * 18;
    required[tiers[i]] = lastRow.slice(requiredStart, requiredStart + 9).map(Number);
  }
  for (let i = 0; i < 4; i++) {
    const maxStart = 10 + i * 18;
    max[tiers[i]] = lastRow.slice(maxStart, maxStart + 9).map(Number);
  }
  return { required, max };
}




export default function App() {
  const [missions, setMissions] = useState<MissionDisplay[]>([]);
  const [jobs, setJobs] = useState<string[]>([]);
  const [activeJob, setActiveJob] = useState<string>("");
  const [researchValues, setResearchValues] = useState<ResearchValues | null>(null);
  const [jobLevels, setJobLevels] = useState<{ [job: string]: number }>(
    localStorage.getItem('jobLevels') ? JSON.parse(localStorage.getItem('jobLevels') || "{}") : {}
  );
  const [jobResearch, setJobResearch] = useState<{ [job: string]: { [key: string]: number } }>(
    localStorage.getItem('jobResearch') ? JSON.parse(localStorage.getItem('jobResearch') || "{}" ) : {}
  );
  const [missionProgress, setMissionProgress] = useState<{ [id: string]: { rank: string; time: number } }>(
    localStorage.getItem('missionProgress') ? JSON.parse(localStorage.getItem('missionProgress') || "{}" ) : {}
  );
  const [dataRate, setDataRate] = useState<number>(0);

  useEffect(() => {
    localStorage.setItem('jobLevels', JSON.stringify(jobLevels));
  }, [jobLevels]);

  useEffect(() => {
    localStorage.setItem('jobResearch', JSON.stringify(jobResearch));
  }, [jobResearch]);

  useEffect(() => {
    localStorage.setItem('missionProgress', JSON.stringify(missionProgress));
  }, [missionProgress]);

  useEffect(() => {
    async function fetchData() {
      const [classJobRaw, missionUnitRaw, missionRewardRaw, cosmoToolRaw] = await Promise.all([
        fetchCsv('data/ClassJob.csv'),
        fetchCsv('data/WKSMissionUnit.csv'),
        fetchCsv('data/WKSMissionReward.csv'),
        fetchCsv('data/WKSCosmoToolDataAmount.csv'),
      ]);

      const jobMap = parseClassJobs(classJobRaw);
      const jobList = Array.from(jobMap.values()).map(j => j.abbreviation);
      setJobs(jobList);
      if (jobList.length > 0) setActiveJob(jobList[0]);

      const rewardMap = parseMissionRewards(missionRewardRaw);

      const missionDisplays: MissionDisplay[] = [];
      for (let i = 0; i < missionUnitRaw.length; i++) {
        const row = missionUnitRaw[i];
        const id = Number(row[0]);
        const name = row[1];
        const rawJobId = Number(row[3]);
        const rewardId = Number(row[9]);
        const missionClass = Number(row[7]);
        const correctedJobId = rawJobId - 1;
        const job = jobMap.get(correctedJobId);
        const reward = rewardMap.get(rewardId);
        const isCritical = (Number(row[13]) != 0);
        if (!job || !reward) continue;

        missionDisplays.push({
          id: id, // Add id field
          name,
          cosmocredits: reward.cosmocredits,
          lunarcredits: reward.lunarcredits,
          research1: reward.researchRewards[1],
          research2: reward.researchRewards[2],
          research3: reward.researchRewards[3],
          research4: reward.researchRewards[4],
          jobAbbreviation: job.abbreviation,
          missionClass,
          isCritical,
        });
      }

      setMissions(missionDisplays);
      setResearchValues(parseCosmoToolData(cosmoToolRaw));
    }

    fetchData();
  }, []);

  const displayedMissions = missions.filter(m => m.jobAbbreviation === activeJob);
  const level = jobLevels[activeJob] || 1;
  const research = jobResearch[activeJob] || { I: 0, II: 0, III: 0, IV: 0 };

  const setLevel = (newLevel: number) => {
    setJobLevels(prev => ({ ...prev, [activeJob]: newLevel }));
  };

  const setResearch = (newResearch: { [key: string]: number }) => {
    setJobResearch(prev => ({ ...prev, [activeJob]: newResearch }));
  };

  const unlockedTiers = ['I', 'II', 'III', 'IV'].filter(tier => {
    if (!researchValues) return false;
    const required = researchValues.required[tier][level - 1] || 0;
    const max = researchValues.max[tier][level - 1] || 0;
    return required !== 0 || max !== 0;
  });

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6">Cosmic Research Helper</h1>
      <Tabs jobs={jobs} activeJob={activeJob} setActiveJob={setActiveJob} />
      <DataRate levels={jobLevels} setDataRate={setDataRate}/>
      <div className="flex">
        <ResearchSummary
          activeJob={activeJob}
          researchValues={researchValues}
          level={level}
          setLevel={setLevel}
          research={research}
          setResearch={setResearch}
        />
        <MissionTable
          missions={displayedMissions}
          activeJob={activeJob}
          unlockedTiers={unlockedTiers}
          researchValues={researchValues}
          level={level}
          research={research}
          missionProgress={missionProgress}
          setMissionProgress={setMissionProgress}
          dataRate={dataRate}
        />
      </div>
    </div>
  );
}
