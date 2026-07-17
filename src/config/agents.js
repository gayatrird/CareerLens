export const agents = [
  {
    id: "ats",
    name: "ATS Analyzer",
    emoji: "🤖",
    icon: "manage_search",
    role: "ATS Compatibility",
    style: "You are a highly precise ATS (Applicant Tracking System) engine. You methodically scan resumes for keyword density, section completeness, formatting compliance, and compatibility with automated screening systems.",
    color: "#3b82f6",
    thinkingLabel: "Scanning Keywords...",
    reviewLabel: "ATS Analysis",
    scoreLabel: "ATS Score"
  },
  {
    id: "recruiter",
    name: "Technical Recruiter",
    emoji: "📋",
    icon: "person_search",
    role: "Candidate Screening",
    style: "You are a senior technical recruiter with 10+ years at top tech firms. You evaluate candidates on project relevance, tech stack alignment, experience level, and overall candidacy strength for the specific role.",
    color: "#8b5cf6",
    thinkingLabel: "Reviewing Projects...",
    reviewLabel: "Recruiter Review",
    scoreLabel: "Recruiter Score"
  },
  {
    id: "engineer",
    name: "Senior Engineer",
    emoji: "⚙️",
    icon: "code",
    role: "Technical Depth Review",
    style: "You are a Staff Software Engineer conducting a technical resume review. You evaluate architecture decisions, system design thinking, project complexity, depth of technical contributions, and flag weak technical areas.",
    color: "#10b981",
    thinkingLabel: "Evaluating Architecture...",
    reviewLabel: "Technical Depth",
    scoreLabel: "Technical Score"
  },
  {
    id: "manager",
    name: "Hiring Manager",
    emoji: "🎯",
    icon: "supervisor_account",
    role: "Shortlist Decision",
    style: "You are a Hiring Manager making the final shortlist decision. You evaluate the overall narrative, communication clarity, achievement quantification, cultural signals, and whether this candidate would move forward to an interview.",
    color: "#f59e0b",
    thinkingLabel: "Making Recommendation...",
    reviewLabel: "Manager Decision",
    scoreLabel: "Manager Score"
  },
  {
    id: "optimizer",
    name: "Resume Optimizer",
    emoji: "✨",
    icon: "auto_fix_high",
    role: "Resume Enhancement",
    style: "You are a professional resume writer and career coach. You rewrite resume bullets for maximum impact using the STAR method. You NEVER fabricate experience or invent skills. You only improve the language, structure, and measurability of existing content.",
    color: "#e6c364",
    thinkingLabel: "Improving Resume...",
    reviewLabel: "Optimization",
    scoreLabel: "Impact Score"
  }
];

export const companies = [
  { id: "general", name: "General / Any Company", icon: "business" },
  { id: "google", name: "Google", icon: "g_mobiledata" },
  { id: "amazon", name: "Amazon", icon: "shopping_cart" },
  { id: "microsoft", name: "Microsoft", icon: "window" },
  { id: "jpmorgan", name: "JPMorgan Chase", icon: "account_balance" },
  { id: "barclays", name: "Barclays", icon: "payments" },
  { id: "tcs", name: "TCS", icon: "corporate_fare" },
  { id: "accenture", name: "Accenture", icon: "hub" },
  { id: "infosys", name: "Infosys", icon: "devices" },
  { id: "capgemini", name: "Capgemini", icon: "cloud" },
];

export const companyContexts = {
  general: "",
  google: "Google prioritizes Data Structures & Algorithms mastery, System Design at scale, and strong academic/project signals. They heavily use structured interviews (LeetCode-style) and value candidates who can demonstrate impact with numbers.",
  amazon: "Amazon heavily emphasizes Leadership Principles (16 LPs) in their hiring process. They look for ownership, bias for action, customer obsession, and frugality. STAR-format behavioral answers are critical. Technical roles also need strong system design fundamentals.",
  microsoft: "Microsoft values growth mindset, collaboration, and cross-team impact. They look for strong problem-solving, clear communication, and cultural fit with their 'Learn-it-all' philosophy. Azure/cloud experience is a strong plus.",
  jpmorgan: "JPMorgan prioritizes candidates with strong quantitative skills, finance domain knowledge, and programming proficiency (Python, Java, C++). Regulatory compliance awareness, risk management, and attention to detail are valued. FRM/CFA knowledge is a bonus.",
  barclays: "Barclays values analytical skills, financial modeling, and technology innovation in banking. They look for candidates with Python, SQL, and an understanding of capital markets. Strong academic background and teamwork are emphasized.",
  tcs: "TCS hires for large-scale enterprise projects. They value strong fundamentals in Java/.NET/Python, database management, and SDLC knowledge. Communication skills and adaptability are highly valued. Certifications (AWS, Azure, SAP) are strong differentiators.",
  accenture: "Accenture looks for versatile technologists who can work across multiple tech stacks and client environments. Consulting skills, client communication, and adaptability are as important as technical skills. Cloud, AI/ML, and SAP skills are in demand.",
  infosys: "Infosys values programming fundamentals, problem-solving, and learning agility. They hire for diverse projects and value adaptability. Strong coding skills in Java/Python, good communication, and a willingness to learn new technologies are key.",
  capgemini: "Capgemini focuses on digital transformation expertise. They value cloud (AWS/Azure/GCP), DevOps, AI/ML, and ERP skills. They look for candidates who can bridge business and technology, with good communication and project delivery experience."
};
