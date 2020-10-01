rs.initiate({
  _id: "enter clsuter name",
  members: [
    {
      _id: 0,
      host: "<enter node ip>:27017",
      arbiterOnly: false,
      hidden: false,
      buildIndexes: true,
      priority: 10,
      votes: 1,
    },
    {
      _id: 1,
      host: "<enter node ip>27017",
      arbiterOnly: false,
      hidden: false,
      buildIndexes: true,
      priority: 5,
      votes: 1,
    },
    {
      _id: 2,
      host: "<enter node ip>:27017",
      arbiterOnly: false,
      hidden: false,
      buildIndexes: true,
      priority: 5,
      votes: 1,
    },
    {
      _id: 3,
      host: "<enter node ip>:27017",
      arbiterOnly: false,
      hidden: false,
      buildIndexes: true,
      priority: 2,
      votes: 1,
    },
    {
      _id: 4,
      host: "<enter node ip>:27017",
      arbiterOnly: false, // switch to true if arbiter is desired
      hidden: false,
      buildIndexes: true,
      priority: 0, // means it will never be elected
      votes: 1,
    },
  ],
  settings: {
    chainingAllowed: true,
    heartbeatIntervalMillis: 1000, // default is 2000
    heartbeatTimeoutSecs: 3, // default is 10
    electionTimeoutMillis: 5000, // default is 10000
    catchUpTimeoutMillis: -1, // default
    catchUpTakeoverDelayMillis: 10000, // default 30000
  },
});
