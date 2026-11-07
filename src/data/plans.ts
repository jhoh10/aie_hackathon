import type { CategoryId, Strength, PlanId, Plan } from './types';

// Exact data from the checked-in, read-only repository source.
export const CATEGORY: Record<CategoryId, {name: string; note: string}> = {
  intent:      {name:'Intent',                     note:'The change does what was asked'},
  boundaries:  {name:'Edge cases and failure modes', note:'Unusual inputs, limits, errors and misuse'},
  integration: {name:'Integration and contracts',  note:'Fits the components and APIs around it'},
  conformance: {name:'Architecture conformance',   note:'Follows the repo\'s design rules'},
  safety:      {name:'Safety and compliance',      note:'Security, privacy and the standards that apply'},
  budgets:     {name:'Quality budgets',            note:'Performance, accessibility and cost limits'},
  formal:      {name:'Formal guarantees',          note:'Proved for every input in Lean 4, checked by its kernel'},
  model:       {name:'Code matches the model',     note:'The shipped code agrees with what was proved'},
  review: {name:'From review', note:'Proposed claim edits · needs approval'},
  preserved:   {name:'Preserved behaviour',        note:'What already worked keeps working'}
};

export const STRENGTH: Record<Strength, {label: string; tip: string}> = {
  proof:     {label:'Proof',              tip:'Holds for all inputs'},
  generated: {label:'Generated inputs',   tip:'Property-based, fuzz or differential runs over many inputs'},
  failpass:  {label:'Fails before, passes after', tip:'Shown to detect the bug on the old code'},
  example:   {label:'Example test',       tip:'Specific inputs and outputs'},
  static:    {label:'Static check',       tip:'Types, lint, dependency or import rules'},
  observed:  {label:'Observed',           tip:'Screenshot, log scan or manual check'}
};

export const PLANS: Record<PlanId, Plan> = {
  bugfix: {
    label:'Bug fix',
    eyebrow:'sympy/sympy · issue #24661 · .verify/plan.md',
    title:'parse_expr(evaluate=False) for relationals',
    why:'<b>Bug fix:</b> the key claim must <b>fail on the old code and pass on the fix</b>. The rest covers nearby inputs the fix could get wrong, and keeps everything else unchanged.',
    categories:[
      {cat:'intent', open:true, claims:[
        {id:'c1', kind:'behavior_change', text:"parse_expr('1 < 2', evaluate=False) returns the unevaluated Lt(1, 2), not True.",
         evidence:[{type:'Unit', s:'failpass', what:'Fails on the old commit (returns True); passes on the fix'}]},
        {id:'c2', kind:'behavior_change', text:'>, <=, >=, == and != with evaluate=False return unevaluated Gt, Le, Ge, Eq and Ne.',
         evidence:[{type:'Unit (parametrized)', s:'example', what:'One case per operator against Gt/Le/Ge/Eq/Ne'}]}
      ]},
      {cat:'boundaries', open:true, claims:[
        {id:'c3', kind:'behavior_change', text:'Symbolic comparisons such as x + 1 > y stay unevaluated, operands included.',
         evidence:[{type:'Unit', s:'example', what:'x < y and x + 1 > y give unevaluated relationals with unevaluated operands'}]},
        {id:'c4', kind:'behavior_change', amended:true, text:'A chained comparison 1 < 2 < 3 returns an unevaluated And of pairwise comparisons, not True.',
         evidence:[{type:'Unit', s:'example', what:'1 < 2 < 3 → And(Lt(1,2), Lt(2,3), evaluate=False)'}]}
      ]},
      {cat:'integration', open:true, claims:[
        {id:'c5', kind:'behavior_change', text:'(1 < 2) & (3 > 2) with evaluate=False returns an unevaluated And of relationals.',
         evidence:[{type:'Integration', s:'example', what:'Full parse_expr pipeline: relational and boolean transforms together'}]}
      ]},
      {cat:'preserved', open:false, routine:true, claims:[
        {id:'c6', kind:'no_behavior_change', text:"Without evaluate=False, parse_expr('1 < 2') is still True and x < y is unchanged.",
         evidence:[{type:'Unit', s:'example', what:"Default parse_expr results unchanged"}]},
        {id:'c7', kind:'no_behavior_change', text:'Every existing parser test still passes.',
         evidence:[{type:'Existing suite', s:'example', what:'sympy/parsing/tests: 46 passed, 9 skipped'}]}
      ]}
    ],
    skipped:[
      ['Architecture conformance', 'One method added to an existing class; no new modules or dependencies.'],
      ['Safety and compliance', 'Parses math expressions; no auth, personal data or new external input.'],
      ['Quality budgets', 'Adds one AST visitor; no hot path or large data involved.'],
      ['Formal guarantees', 'Small operator set is fully covered by example tests; a proof would add little.']
    ]
  },

  feature: {
    label:'New feature',
    eyebrow:'pocketbase/pocketbase · example feature · .verify/plan.md',
    title:'Password reset by email link',
    why:'<b>New feature:</b> beyond what users can do, claims show the change follows the <b>architecture guide</b> and the <b>security rules for auth code</b>. Each of those claims names the rule it satisfies.',
    categories:[
      {cat:'intent', open:true, claims:[
        {id:'f1', kind:'behavior_change', text:'A user with an account can request a reset email and set a new password from its link.',
         evidence:[{type:'E2E', s:'example', what:'Request → captured email → open link → set password → log in with the new one'}]}
      ]},
      {cat:'boundaries', open:true, claims:[
        {id:'f2', kind:'behavior_change', text:'A reset link works only once.',
         evidence:[{type:'Integration', s:'example', what:'Second use of the same token returns 400'}]},
        {id:'f3', kind:'behavior_change', text:'A reset link older than 30 minutes is rejected.',
         evidence:[{type:'Integration', s:'example', what:'Clock advanced 31 minutes → 400, password unchanged'}]},
        {id:'f4', kind:'behavior_change', text:'Malformed or tampered tokens are rejected without a server error.',
         evidence:[{type:'Fuzz', s:'generated', what:'10,000 random and mutated tokens → always 400, never 500'}]}
      ]},
      {cat:'integration', open:true, claims:[
        {id:'f5', kind:'behavior_change', refs:['Arch: API conventions'], text:'The new endpoints follow the existing route naming and error format.',
         evidence:[{type:'Contract', s:'example', what:'Responses validated against the existing API error schema'}]}
      ]},
      {cat:'conformance', open:true, claims:[
        {id:'a1', kind:'behavior_change', refs:['Arch: reuse mailer'], text:'Emails go through the existing mailer; no new dependencies are added.',
         evidence:[{type:'Dependency rule', s:'static', what:'go.mod unchanged; new code imports the mailer package only'}]},
        {id:'a2', kind:'behavior_change', refs:['Arch: migrations'], text:'The schema change can be rolled back.',
         evidence:[{type:'Migration', s:'example', what:'Up, down, up on a copy of the test database'}]}
      ]},
      {cat:'safety', open:true, claims:[
        {id:'s1', kind:'behavior_change', sec:true, refs:['OWASP ASVS V2.5'], text:'Known and unknown emails get the same response, so accounts cannot be discovered.',
         evidence:[{type:'Security', s:'example', what:'Status, body and timing bucket compared for both cases'}]},
        {id:'s2', kind:'behavior_change', sec:true, refs:['Security rule: tokens at rest'], text:'Reset tokens are stored only as a hash.',
         evidence:[{type:'Integration', s:'example', what:'Database holds a hash, never the raw token'}]},
        {id:'s3', kind:'behavior_change', sec:true, refs:['Security rule: rate limits'], text:'At most 5 reset requests per email per hour.',
         evidence:[{type:'Integration', s:'example', what:'6th request within an hour returns 429'}]},
        {id:'s4', kind:'behavior_change', sec:true, refs:['Security rule: secrets in logs'], text:'Reset tokens never appear in logs.',
         evidence:[{type:'Log scan', s:'observed', what:'Full E2E run; logs searched for every issued token'}]},
        {id:'s5', kind:'behavior_change', sec:true, refs:['OWASP ASVS V2.5'], text:'Existing sessions are signed out after a password reset.',
         evidence:[{type:'Integration', s:'example', what:'Old session token returns 401 after reset'}]}
      ]},
      {cat:'budgets', open:true, claims:[
        {id:'b1', kind:'behavior_change', text:'The reset page is usable on desktop and mobile, with no serious accessibility issues.',
         evidence:[{type:'Screenshot', s:'observed', what:'desktop.png and iphone.png attached to the report'},
                   {type:'Accessibility', s:'static', what:'axe: no serious or critical violations'}]}
      ]},
      {cat:'preserved', open:false, routine:true, claims:[
        {id:'r1', kind:'no_behavior_change', text:'Login, sign-up and OAuth flows work as before.',
         evidence:[{type:'Existing suite', s:'example', what:'apis/record_auth_*_test.go'}]},
        {id:'r2', kind:'no_behavior_change', text:'Existing API responses keep the same shape.',
         evidence:[{type:'Contract', s:'example', what:'Recorded responses for existing endpoints unchanged'}]}
      ]}
    ],
    skipped:[
      ['Formal guarantees', 'No small pure core where a proof pays off; token logic is covered by fuzzing.'],
      ['Code matches the model', 'No formal model, so nothing to match.']
    ]
  },

  refactor: {
    label:'Refactor',
    eyebrow:'pocketbase/pocketbase · example refactor · .verify/plan.md',
    title:'Move record validation into its own package',
    why:'<b>Refactor:</b> nothing new should happen, so <b>preserved behaviour is the main claim</b>. It stays open and is never auto-approved. Conformance claims say what the new structure must look like.',
    categories:[
      {cat:'preserved', open:true, routine:false, claims:[
        {id:'p1', kind:'no_behavior_change', text:'Every API response is identical before and after, for recorded real traffic.',
         evidence:[{type:'Differential replay', s:'generated', what:'5,000 recorded requests replayed on old and new builds; responses byte-identical'}]},
        {id:'p2', kind:'no_behavior_change', text:'Validation error messages and codes are unchanged.',
         evidence:[{type:'Snapshot', s:'example', what:'Error snapshots for every validator compared with the old build'}]},
        {id:'p3', kind:'no_behavior_change', text:'Every existing test passes without being edited.',
         evidence:[{type:'Existing suite', s:'example', what:'go test ./... ; no test files in the diff'}]}
      ]},
      {cat:'conformance', open:true, claims:[
        {id:'a1', kind:'no_behavior_change', refs:['Arch: layering'], text:'The new validation package does not import the API or database layers.',
         evidence:[{type:'Import rule', s:'static', what:'go list deps check fails on any import of apis/ or daos/'}]},
        {id:'a2', kind:'no_behavior_change', refs:['Arch: layering'], text:'There are no import cycles.',
         evidence:[{type:'Build', s:'static', what:'go vet ./... and build succeed'}]}
      ]},
      {cat:'budgets', open:true, claims:[
        {id:'b1', kind:'no_behavior_change', text:'Validation is no more than 5% slower.',
         evidence:[{type:'Benchmark', s:'example', what:'BenchmarkValidateRecord, old vs new, 10 runs each'}]}
      ]}
    ],
    skipped:[
      ['Intent', 'No new behaviour is intended.'],
      ['Edge cases and failure modes', 'Covered by the differential replay: any changed edge case changes a response.'],
      ['Safety and compliance', 'No change to auth, data handling or external input.'],
      ['Formal guarantees', 'Behaviour-preserving move; differential replay is the stronger, cheaper evidence.']
    ]
  },

  formal: {
    label:'Critical logic (Lean)',
    eyebrow:'pocketbase/pocketbase · example critical logic · .verify/plan.md',
    title:'Pagination for record lists',
    why:'<b>Critical logic:</b> for a small pure function where a missed case is costly, the key claims are <b>proved in Lean 4 for every input</b>, not sampled. A second group ties the shipped Go code to the proven model.',
    categories:[
      {cat:'formal', open:true, claims:[
        {id:'p1', kind:'behavior_change', text:'Every record appears on exactly one page.',
         evidence:[{type:'Lean theorem', s:'proof', code:"theorem mem_exactly_one_page (perPage total i : Nat)\n    (hp : 0 < perPage) (hi : i < total) :\n    ∃! page, (bounds perPage page total).1 ≤ i ∧\n             i < (bounds perPage page total).2"},
                   {type:'Proof check', s:'static', what:'lake build passes; #print axioms shows no sorryAx'}]},
        {id:'p2', kind:'behavior_change', text:'No page holds more than perPage records.',
         evidence:[{type:'Lean theorem', s:'proof', code:"theorem page_size_le (perPage page total : Nat) :\n    (bounds perPage page total).2 - (bounds perPage page total).1 ≤ perPage"}]},
        {id:'p3', kind:'behavior_change', text:'The page count is zero only when there are no records.',
         evidence:[{type:'Lean theorem', s:'proof', code:"theorem totalPages_eq_zero_iff (perPage total : Nat) (hp : 0 < perPage) :\n    totalPages perPage total = 0 ↔ total = 0"}]}
      ]},
      {cat:'model', open:true, claims:[
        {id:'m1', kind:'behavior_change', text:'The Go pagination returns the same page bounds as the Lean model.',
         evidence:[{type:'Differential', s:'generated', what:'100,000 generated (perPage, page, total) inputs; Go vs. compiled Lean model'}]}
      ]},
      {cat:'boundaries', open:true, claims:[
        {id:'m2', kind:'behavior_change', text:'A page past the end returns an empty list, not an error; perPage = 0 is rejected with 400.',
         evidence:[{type:'Unit', s:'example', what:'page = totalPages + 1 → 200 with items: []; perPage = 0 → 400'}]}
      ]},
      {cat:'preserved', open:false, routine:true, claims:[
        {id:'r1', kind:'no_behavior_change', text:'Existing list API tests pass.',
         evidence:[{type:'Existing suite', s:'example', what:'apis/record_crud_list_test.go'}]},
        {id:'r2', kind:'no_behavior_change', text:'List responses keep the same shape.',
         evidence:[{type:'Contract', s:'example', what:'page, perPage, totalItems, totalPages, items'}]}
      ]}
    ],
    skipped:[
      ['Intent', 'Covered by the formal guarantees, which state the intended behaviour exactly.'],
      ['Safety and compliance', 'Reads already-authorised records; access rules unchanged.'],
      ['Quality budgets', 'Constant-time arithmetic.']
    ]
  }
};

