//
// CREATION OF THE ADMIN USER
db.createUser({
  user: "admin",
  pwd: passwordPrompt(),
  roles: [
    {
      role: "root",
      db: "admin",
    },
    {
      role: "userAdminAnyDatabase",
      db: "admin",
    },
    {
      role: "clusterMonitor",
      db: "admin",
    },
    {
      role: "dbOwner",
      db: "LocalAAA",
    },
    {
      role: "dbOwner",
      db: "pronghorn",
    },
  ],
});
//
// CREATION OF THE PRONGHORN USER
db.createUser({
  user: "pronghorn",
  pwd: passwordPrompt(),
  roles: [
    {
      role: "dbOwner",
      db: "pronghorn",
    },
    {
      role: "dbOwner",
      db: "LocalAAA",
    },
    {
      role: "clusterMonitor",
      db: "admin",
    },
  ],
});
//
// CREATION OF LOCALAAA_USER
db.createUser({
  user: "localaaa_user",
  pwd: passwordPrompt(),
  roles: [
    {
      role: "dbOwner",
      db: "LocalAAA",
    },
  ],
});
