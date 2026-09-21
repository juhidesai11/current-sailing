/* Illustrative data for the CURRENT prototype.
   `photo` is the file each opportunity expects in images/ (see README). */

window.CURRENT_DATA = {
  people: {
    "tom-reyes": { name: "Tom R.", verified: true },
    "ingrid-solberg": { name: "Ingrid S.", verified: false },
    "ana-ferreira": { name: "Ana F.", verified: true },
    "dev-mehta": { name: "Dev M.", verified: true },
  },

  opportunities: [
    {
      id: "friday-night-race",
      title: "Friday Night Race",
      boat: "Express 27",
      location: "Berkeley Marina",
      day: "Friday", time: "5:30 PM",
      needs: "Jib / Trim",
      level: "Intermediate+",
      skipper: "tom-reyes",
      photo: "images/sail-friday-night-race.jpg",
      alt: "Express 37 keelboats racing upwind on San Francisco Bay",
      pos: "30% 50%",
      ph: "#2a4a66",
    },
    {
      id: "casual-bay-sail",
      title: "Casual Bay Sail",
      boat: "Catalina 34",
      location: "Sausalito",
      day: "Saturday", time: "10:00 AM",
      needs: "General crew",
      level: "Beginner friendly",
      skipper: "ingrid-solberg",
      photo: "images/sail-casual-bay-sail.jpg",
      alt: "A foiling catamaran sailing past Alcatraz on San Francisco Bay",
      pos: "45% 50%",
      ph: "#6f8ea0",
    },
    {
      id: "practice-sail",
      title: "Practice Sail",
      boat: "Melges 24",
      location: "Alameda",
      day: "Wednesday", time: "6:00 PM",
      needs: "Trimmer / Mainsheet",
      level: "Intermediate",
      skipper: "ana-ferreira",
      photo: "images/sail-practice-sail.jpg",
      alt: "A SailGP catamaran with its wing sail up on San Francisco Bay",
      pos: "50% 78%",
      ph: "#4c6b80",
    },
    {
      id: "sunday-race-crew",
      title: "Sunday Race Crew",
      boat: "J/105",
      location: "South Beach Harbor",
      day: "Sunday", time: "10:30 AM",
      needs: "Bow / Pit",
      level: "Experienced",
      skipper: "dev-mehta",
      photo: "images/sail-sunday-race-crew.jpg",
      alt: "Two SailGP catamarans racing close together off Alcatraz",
      pos: "50% 50%",
      ph: "#1d3a57",
    },
  ],

  profile: {
    slug: "maya-ellison",
    name: "Maya Ellison",
    location: "San Francisco Bay Area",
    photo: "images/profile-maya-ellison.jpg",
    bio: "Started in dinghies, now racing keelboats on the Bay most weekends. Happiest on the bow.",
    tags: ["Racing", "Dinghy", "Keelboat"],
    credentials: ["US Sailing Basic Keelboat"],
    boats: ["J/105", "Express 27", "Melges 24", "Catalina 34"],
    positions: ["Trimmer", "Bow", "Pit"],
    confirmedSails: 41,
    repeatConnections: 9,
    sailedWith: ["TR", "AF", "DM", "IS", "JK"],
    sailedWithMore: 4,

    /* Full profile page (profile.html). Everything below is fictional. */
    profileNo: "0417",
    homeWaters: "Alameda, San Francisco Bay",
    sailingSince: 2016,
    verification: {
      status: "Identity verified",
      note: "Prototype verification. No real identity check has taken place.",
    },
    bandPhoto: {
      src: "images/sail-friday-night-race.jpg",
      alt: "Keelboats racing upwind on San Francisco Bay",
      pos: "30% 50%",
    },
    types: [
      { name: "Racing", note: "Friday night series and weekend one-design racing, mostly on the Central Bay." },
      { name: "Recreational sailing", note: "Skippers a J/105 out of Sausalito on Saturday mornings, with daysails to Angel Island. Happy to help new crew feel at home." },
      { name: "Coaching", note: "Assists on beginner keelboat mornings at the weekend." },
    ],
    positionsDetail: [
      { name: "Bow", note: "Preferred. Spinnaker sets and douses, and calling the distance to the mark." },
      { name: "Trimmer", note: "Jib and spinnaker. Comfortable in a breeze." },
      { name: "Pit", note: "Halyards and line management when the bow is taken." },
    ],
    boatsDetail: [
      { name: "J/105", spec: "34 ft, one-design keelboat", sails: 14 },
      { name: "Express 27", spec: "27 ft, one-design keelboat", sails: 11 },
      { name: "Melges 24", spec: "24 ft, sport boat", sails: 9 },
      { name: "Catalina 34", spec: "34 ft, cruising keelboat", sails: 7 },
    ],
    credentialsDetail: [
      { name: "US Sailing Basic Keelboat", issuer: "US Sailing", year: 2019 },
      { name: "US Sailing Small Boat Level 1 Instructor", issuer: "US Sailing", year: 2022 },
      { name: "Adult First Aid and CPR", issuer: "Sample training provider", year: 2025 },
    ],
    history: [
      { date: "18 Sep", title: "Friday Night Race", boat: "Express 27", place: "Berkeley Marina", role: "Jib trim", skipper: "Tom R." },
      { date: "12 Sep", title: "Casual Bay Sail", boat: "Catalina 34", place: "Sausalito", role: "General crew", skipper: "Ingrid S." },
      { date: "9 Sep", title: "Practice Sail", boat: "Melges 24", place: "Alameda", role: "Trimmer", skipper: "Ana F." },
      { date: "30 Aug", title: "Sunday Race", boat: "J/105", place: "South Beach Harbor", role: "Bow", skipper: "Dev M." },
      { date: "16 Aug", title: "Sunday Race", boat: "J/105", place: "South Beach Harbor", role: "Bow and pit", skipper: "Dev M." },
    ],
    people: [
      { initials: "TR", slug: "tom-reyes", name: "Tom R.", role: "Skipper", boat: "Express 27", sails: 9, verified: true },
      { initials: "AF", slug: "ana-ferreira", name: "Ana F.", role: "Skipper", boat: "Melges 24", sails: 7, verified: true },
      { initials: "DM", name: "Dev M.", role: "Skipper", boat: "J/105", sails: 5, verified: true },
      { initials: "IS", name: "Ingrid S.", role: "Skipper", boat: "Catalina 34", sails: 4, verified: false },
      { initials: "JK", name: "Jules K.", role: "Crew", boat: "Express 27", sails: 3, verified: false },
      { initials: "SO", name: "Sam O.", role: "Crew", boat: "J/105", sails: 3, verified: false },
    ],
    peopleMore: 3,
  },
};

/* Other sailors, reusable by profile.html?p=<slug>. Same shape as `profile` above.
   All fictional. Where a name has a `slug`, the profile page links to that sailor. */
const VERIFY = {
  status: "Identity verified",
  note: "Prototype verification. No real identity check has taken place.",
};

const tom = {
  slug: "tom-reyes", name: "Tom Reyes", location: "San Francisco Bay Area",
  photo: "images/profile-tom-reyes.jpg",
  bio: "Runs a friendly Friday night boat out of Berkeley where new crew get a real job, not just a place to sit.",
  tags: ["Racing", "Keelboat"],
  credentials: ["US Sailing Basic Keelboat"], boats: ["Express 27", "J/105", "Santa Cruz 27"], positions: ["Helm", "Tactician"],
  confirmedSails: 63, repeatConnections: 12, sailedWith: ["ME", "JK", "PN", "ML", "AF"], sailedWithMore: 7,
  profileNo: "0388", homeWaters: "Berkeley Marina, San Francisco Bay", sailingSince: 2011, verification: VERIFY,
  bandPhoto: { src: "images/sail-friday-night-race.jpg", alt: "Keelboats racing upwind on San Francisco Bay", pos: "30% 50%" },
  types: [
    { name: "Racing", note: "Skippers an Express 27 in the Friday night series and the occasional weekend regatta." },
    { name: "Recreational sailing", note: "Slow Sunday sails to Angel Island when the racing calendar allows." },
  ],
  positionsDetail: [
    { name: "Helm", note: "Steers on the racecourse and in the harbor." },
    { name: "Tactician", note: "Calls the shifts and the starts when someone else drives." },
  ],
  boatsDetail: [
    { name: "Express 27", spec: "27 ft, one-design keelboat", sails: 42 },
    { name: "J/105", spec: "34 ft, one-design keelboat", sails: 11 },
    { name: "Santa Cruz 27", spec: "27 ft, light-displacement keelboat", sails: 10 },
  ],
  credentialsDetail: [
    { name: "US Sailing Basic Keelboat", issuer: "US Sailing", year: 2013 },
    { name: "Adult First Aid and CPR", issuer: "Sample training provider", year: 2024 },
  ],
  history: [
    { date: "18 Sep", title: "Friday Night Race", boat: "Express 27", place: "Berkeley Marina", role: "Skipper", skipper: "Maya E." },
    { date: "11 Sep", title: "Friday Night Race", boat: "Express 27", place: "Berkeley Marina", role: "Skipper", skipper: "Jules K." },
    { date: "4 Sep", title: "Friday Night Race", boat: "Express 27", place: "Berkeley Marina", role: "Skipper", skipper: "Priya N." },
    { date: "23 Aug", title: "Sunday Sail", boat: "Express 27", place: "Berkeley Marina", role: "Skipper", skipper: "Priya N." },
  ],
  people: [
    { initials: "ME", slug: "maya-ellison", name: "Maya E.", role: "Crew", boat: "Express 27", sails: 9, verified: true },
    { initials: "JK", name: "Jules K.", role: "Crew", boat: "Express 27", sails: 8, verified: false },
    { initials: "PN", name: "Priya N.", role: "Crew", boat: "Express 27", sails: 6, verified: false },
    { initials: "ML", name: "Marcus L.", role: "Crew", boat: "Express 27", sails: 5, verified: false },
    { initials: "AF", slug: "ana-ferreira", name: "Ana F.", role: "Skipper", boat: "Melges 24", sails: 3, verified: true },
    { initials: "SO", name: "Sam O.", role: "Crew", boat: "J/105", sails: 3, verified: false },
  ],
  peopleMore: 6,
};

const ana = {
  slug: "ana-ferreira", name: "Ana Ferreira", location: "San Francisco Bay Area",
  photo: "images/profile-ana-ferreira.jpg",
  bio: "Melges 24 owner and one-design regular. Practices most Wednesdays, races on Sundays, and likes crew who ask questions.",
  tags: ["Racing", "Coaching", "Dinghy"],
  credentials: ["US Sailing Small Boat Level 2 Instructor"], boats: ["Melges 24", "J/105", "Laser"], positions: ["Helm", "Tactician"],
  confirmedSails: 88, repeatConnections: 14, sailedWith: ["ME", "TR", "DM", "SO", "EK"], sailedWithMore: 9,
  profileNo: "0452", homeWaters: "Alameda, San Francisco Bay", sailingSince: 2009, verification: VERIFY,
  bandPhoto: { src: "images/sail-sunday-race-crew.jpg", alt: "Two boats racing close together off Alcatraz", pos: "50% 50%" },
  types: [
    { name: "Racing", note: "Melges 24 fleet racing on Sundays and the fall series." },
    { name: "Coaching", note: "Runs Wednesday practice sails focused on boat handling and starts." },
    { name: "Recreational sailing", note: "Casual evening sails on the Estuary in summer." },
  ],
  positionsDetail: [
    { name: "Helm", note: "Steers her own Melges 24." },
    { name: "Tactician", note: "Occasionally calls tactics on friends' boats." },
  ],
  boatsDetail: [
    { name: "Melges 24", spec: "24 ft, sport boat", sails: 61 },
    { name: "J/105", spec: "34 ft, one-design keelboat", sails: 17 },
    { name: "Laser", spec: "14 ft, single-handed dinghy", sails: 10 },
  ],
  credentialsDetail: [
    { name: "US Sailing Small Boat Level 2 Instructor", issuer: "US Sailing", year: 2018 },
    { name: "US Sailing Basic Keelboat", issuer: "US Sailing", year: 2012 },
    { name: "Adult First Aid and CPR", issuer: "Sample training provider", year: 2025 },
  ],
  history: [
    { date: "20 Sep", title: "Sunday Race", boat: "Melges 24", place: "St. Francis Yacht Club", role: "Skipper", skipper: "Rosa B." },
    { date: "16 Sep", title: "Practice Sail", boat: "Melges 24", place: "Alameda", role: "Skipper", skipper: "Eli K." },
    { date: "9 Sep", title: "Practice Sail", boat: "Melges 24", place: "Alameda", role: "Skipper", skipper: "Maya E." },
    { date: "30 Aug", title: "Sunday Race", boat: "Melges 24", place: "St. Francis Yacht Club", role: "Skipper", skipper: "Eli K." },
  ],
  people: [
    { initials: "ME", slug: "maya-ellison", name: "Maya E.", role: "Crew", boat: "Melges 24", sails: 7, verified: true },
    { initials: "TR", slug: "tom-reyes", name: "Tom R.", role: "Skipper", boat: "Express 27", sails: 3, verified: true },
    { initials: "DM", name: "Dev M.", role: "Skipper", boat: "J/105", sails: 6, verified: true },
    { initials: "SO", name: "Sam O.", role: "Crew", boat: "Melges 24", sails: 5, verified: false },
    { initials: "EK", name: "Eli K.", role: "Crew", boat: "Melges 24", sails: 5, verified: false },
    { initials: "RB", name: "Rosa B.", role: "Crew", boat: "Melges 24", sails: 4, verified: false },
  ],
  peopleMore: 8,
};

const chris = {
  slug: "chris-park", name: "Chris Park", location: "San Francisco Bay Area",
  photo: "images/profile-chris-park.jpg",
  bio: "Delivers boats along the California coast. Patient, organised about weather and watches, and good at making a long passage feel short.",
  tags: ["Offshore", "Delivery", "Cruising"],
  credentials: ["US Sailing Offshore Safety at Sea"], boats: ["Beneteau 40", "Catalina 42", "Jeanneau 379"], positions: ["Skipper", "Navigator"],
  confirmedSails: 52, repeatConnections: 8, sailedWith: ["LT", "GW", "HN", "NV", "JK"], sailedWithMore: 3,
  profileNo: "0291", homeWaters: "South Beach Harbor, San Francisco Bay", sailingSince: 2005, verification: VERIFY,
  bandPhoto: { src: "images/sail-monterey-delivery.jpg", alt: "A sailboat on open water at sunset", pos: "60% 50%" },
  types: [
    { name: "Deliveries", note: "Coastal deliveries between San Francisco, Monterey and Southern California." },
    { name: "Recreational sailing", note: "Overnight cruises inside the Bay when the weather window is good." },
  ],
  positionsDetail: [
    { name: "Skipper", note: "In command on every delivery, with a written watch schedule." },
    { name: "Navigator", note: "Weather routing and passage planning." },
  ],
  boatsDetail: [
    { name: "Beneteau 40", spec: "40 ft, cruising keelboat", sails: 19 },
    { name: "Jeanneau 379", spec: "37 ft, cruising keelboat", sails: 19 },
    { name: "Catalina 42", spec: "42 ft, cruising keelboat", sails: 14 },
  ],
  credentialsDetail: [
    { name: "US Sailing Offshore Safety at Sea", issuer: "US Sailing", year: 2021 },
    { name: "US Sailing Basic Cruising", issuer: "US Sailing", year: 2012 },
    { name: "Adult First Aid and CPR", issuer: "Sample training provider", year: 2025 },
  ],
  history: [
    { date: "6 Sep", title: "Monterey to San Francisco Delivery", boat: "Beneteau 40", place: "Monterey", role: "Skipper", skipper: "Lena T." },
    { date: "8 Aug", title: "Half Moon Bay Overnight", boat: "Jeanneau 379", place: "San Francisco", role: "Skipper", skipper: "Gus W." },
    { date: "14 Jun", title: "SF to Santa Barbara Delivery", boat: "Catalina 42", place: "San Francisco", role: "Skipper", skipper: "Lena T." },
  ],
  people: [
    { initials: "LT", name: "Lena T.", role: "Crew", boat: "Beneteau 40", sails: 6, verified: false },
    { initials: "GW", name: "Gus W.", role: "Crew", boat: "Jeanneau 379", sails: 5, verified: false },
    { initials: "HN", name: "Hana N.", role: "Crew", boat: "Catalina 42", sails: 4, verified: false },
    { initials: "NV", name: "Nora V.", role: "Crew", boat: "Beneteau 40", sails: 2, verified: false },
    { initials: "JK", name: "Jules K.", role: "Crew", boat: "Jeanneau 379", sails: 2, verified: false },
  ],
  peopleMore: 3,
};

/* Lookup for profile.html?p=<slug>. */
window.CURRENT_DATA.profiles = Object.fromEntries(
  [window.CURRENT_DATA.profile, tom, ana, chris].map((p) => [p.slug, p])
);

/* Find a sail. Each sail belongs to a skipper in `profiles`.
   weekday: 0 = Sunday … 6 = Saturday. daysAfter pushes a sail into a later week.
   `area` drives the location filter and `map` places its pin on the illustrative map. */
window.CURRENT_DATA.sails = [
  {
    id: "friday-night-race", type: "Racing", title: "Friday Night Race",
    boat: "Express 27", location: "Berkeley Marina", area: "Berkeley",
    weekday: 5, time: "17:30", duration: "About 3.5 hours, 5:30 to 9:00 PM",
    level: "Intermediate+", minLevel: 1, crewNeeded: "1–2 crew", positions: ["Trimmer", "Pit"],
    skipper: "tom-reyes", map: { x: 262, y: 158 },
    about: "The weekly Friday evening series. We race in a mixed fleet and finish at the dock. Looking for someone comfortable trimming the jib in 15 knots or more, and a pit person who keeps lines tidy.",
    meet: "Berkeley Marina, guest dock", bring: "Non-marking shoes, a warm layer, water.",
    photo: "images/sail-friday-night-race.jpg", alt: "Express 37 keelboats racing upwind on San Francisco Bay", pos: "30% 50%", ph: "#2a4a66",
  },
  {
    id: "saturday-morning-sail", type: "Day sail", title: "Saturday Morning Sail",
    boat: "J/105", location: "Sausalito", area: "Sausalito",
    weekday: 6, time: "09:30", duration: "About 4 hours",
    level: "All levels", minLevel: 0, crewNeeded: "2–3 crew", positions: ["Bow", "Trimmer"],
    skipper: "maya-ellison", map: { x: 132, y: 170 },
    about: "An easy morning on the Bay with a stop for coffee off Angel Island. New crew are welcome. I will walk you through the jobs before we leave the dock.",
    meet: "Sausalito, visitor dock", bring: "Layers, sunscreen, soft-soled shoes.",
    photo: "images/sail-saturday-morning-sail.jpg", alt: "A sailboat under way on blue water in San Francisco Bay", pos: "60% 55%", ph: "#3f7fae",
  },
  {
    id: "sunday-race", type: "Racing", title: "Sunday Race",
    boat: "Melges 24", location: "St. Francis Yacht Club", area: "San Francisco",
    weekday: 0, time: "11:00", duration: "About 4 hours",
    level: "Intermediate+", minLevel: 1, crewNeeded: "1–2 crew", positions: ["Pit", "Trimmer"],
    skipper: "ana-ferreira", map: { x: 110, y: 244 },
    about: "Fleet racing on the city front. We practise starts on Wednesdays, so Sunday is a good place to grow. Weight and experience both matter on a Melges 24, so tell me what you have sailed.",
    meet: "St. Francis Yacht Club, guest dock", bring: "Foul-weather layer, gloves, non-marking shoes.",
    photo: "images/sail-sunday-race-crew.jpg", alt: "Two boats racing close together off Alcatraz", pos: "50% 50%", ph: "#1d3a57",
  },
  {
    id: "monterey-delivery", type: "Delivery", title: "SF to Monterey Delivery",
    boat: "Beneteau 40", location: "San Francisco → Monterey", area: "San Francisco",
    weekday: 5, daysAfter: 7, time: "07:00", multiDay: true, duration: "Two to three days, weather permitting",
    level: "Intermediate+", minLevel: 1, crewNeeded: "2 crew", positions: ["Multiple positions"],
    skipper: "chris-park", map: { x: 184, y: 298 },
    about: "Moving a Beneteau 40 down the coast with an overnight leg. Watches are planned in advance and everyone stands them. You should be comfortable sleeping and working in a seaway.",
    meet: "South Beach Harbor, San Francisco", bring: "Foul-weather gear, harness and tether (or borrow one), seasickness plan.",
    photo: "images/sail-monterey-delivery.jpg", alt: "A sailboat on open water at sunset", pos: "60% 55%", ph: "#5a2f2f",
  },
];
