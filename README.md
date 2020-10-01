# IAP MongoDB ReplicaSet / Cluster

<details open>
<summary style="font-size:30px; font-decoration: bold; ">Purpose</summary>

This directory houses playbooks created for the purpose of both creating and managing a MongoDB Replica Set (aka cluster) with the end result being used in conjunction with the Itential Automation Platform (IAP).

The playbooks were created using and referencing documentation provided by IAP<sup>1</sup> and MongoDB<sup>2</sup>. There are also comments throughout this directory explaining what individual lines might do and/or the reasoning for that line.

</details>
<br/>
<details>
<summary style="font-size:30px">Prereq's</summary>

- VM's with CentOS8, powered on, connected to internet
- Ansible
- SSH connection from your workstation to the nodes

</details>
<br/>
<details>
<summary style="font-size:30px">For Developers</summary>
<br/>

- Connection String to the Cluster

```txt
mongodb://username:password@<list ip:port, ip:port, ip:port/?replicaSet=<name>
```

</details>
<br/>
<details>
<summary style="font-size:30px">Create SSH Conneciton</summary>

- Create ssh key on your work space

```txt
  $ ssh-keygen
```

- Hit enter to save file path
- Hit enter again to not add a password to your ssh directory
- Share ssh key to the remote nodes

```txt
  $ ssh-copy-id <username>@<remote_host>
```

- It will ask you for the password to the remote hosts' user. Enter password and hit enter.
- The below prompt will appear

```txt
  Number of key(s) added: 1

  Now try logging into the machine, with: "ssh <username>@<remote_host>" and check to make sure that only the key(s) you wanted were added.
```

</details>
<br/>
<details>
<summary style="font-size:30px">Ansible Checks</summary>

- Check the playbook syntax

```txt
    ansible-playbook <playbook_name> --syntax-check
```

- Check Node connections

```txt
    ansible <server ip> -m ping -u root
```

- Execute the playbook with prompt to provide remote_user password

```txt
    ansible-playbook <playbook_name> -K
```

</details>
<br/>
<details>
<summary style="font-size:30px">BREAKDOWN: mongo_setup_playbook.yml</summary>
<br/>

_This will be discussing each play (3 total) and the need each is meeting._

#### Node OS Setup

- Disabling Transparent Huge Pages is requested in the IAP docs. To do so, I was able to create a service file that would later allow for an easy method to turn it off.
- Updating the Centos Repo files would late allow for the use of `YUM`
- Updating the soft user limits (ulimit) is requested in the IAP docs<sup>1</sup>.

#### MongoDB Setup

- A little "pre-work" was needed so that Centos knew where to get data for the eventual `yum update` command
- The MongoDB docs<sup>2</sup> provided the necessary repo file found in this directory.
- Updating `yum` is merely precautionary. Installing the other pacakages along with MongoDB were named in the IAP docs<sup>1</sup>.
- MongoDB comes with a default config file that I initially copied into the `cluster_fig.conf` file. The changes made will be discussed in a later section.
- Having a keyfile in the config file dictates other nodes need to have the same keyfile inorder to communicate and authenticate to each other. I created a key file using the below command;

```txt
  openssl rand -base64 756 > /path/to/keyfile
```

- Becasue MongoDB is going to use that keyfile authentication purposes `mongod` needs permissions granted to access it.
- The VM's used need the default 27017 port opened so they can access each other.

#### Starting MongoDB

- Each member of the cluster will need an instance of `mongod` running so it's ideal to run it as a service in the background.
- The goal of this play is to start the service, and change the settings for the node so that `mongod` starts when the vm is power-cycled.

<br/>
</details>
<br/>
<details>
<summary style="font-size:30px">BREAKDOWN: mongo_initiate_cluster.js</summary>

- Before this file is run make sure each memeber in the cluster can access the other members. I did this by using the below command **ON EACH NODE**:

```txt
ssh root@<member01_ip>
mongo --host <member02_ip> --port 27017
```

- Once all members are passing the above check, pick any memeber and run the script in this file in the mongo command window. If the script runs with no errors or issues, the cluster has successfully be initated/started!
- The connection string for developers can be found in the _For Developers_ section.

<br/>

_More info about the settings found in this file are located [HERE](https://docs.mongodb.com/manual/reference/replica-configuration/#replsetgetconfig-output)._

</details>
<br/>
<details>
<summary style="font-size:30px">BREAKDOWN: add_users.js</summary>

- Once all members are in the cluster, pick any memeber and run the two commands below to find which memeber is the primary.

```txt
mongo
```

```js
rs.conf();
```

- Locate and ssh into the **PRIMARY**, and run `mongo` like you did before.
- Once the mongo shell is running, switch to the `admin` database by using the below command.

```js
use admin
```

- Once the admin database is the active database, you will need to add the "admin" user with root access first before you add any other user. The commands to run int the mongo shell can be found in the `add_user.js` file.

</details>
<br/>
<details>
<summary style="font-size:30px">BREAKDOWN: cluster_fig.conf</summary>

- After being installed, MongoDB creates a default config file that is used when running the mongod processs.
- The mongod process should be ready to be run. You can run the mongod procress manually by running `mongod` in the terminal. Given how IAP will be using MongoDB, the `mongo_setup_playbook` creates a mongod service, starts the service, and makes the service run on boot.
- As previously mentioned, MongoDB will start the mongo daemon ( `mongod` ) process with the details outlined in the config file. The `mongo_setup_playbook` removes the default file, and replaces it with `cluster_fig.cfg` .
- Each section of the config file is explained further below.

<br/>

1. The first portion is the same as the default settings. This simply dictates where the logging information will be stored.

```txt
    systemLog:
      destination: file
      logAppend: true
      path: /var/log/mongodb/mongod.log
```

2. The next section dictates where and how to store data that will be used as the content of the database. It's important to note the default storage engine for the newer release versions of MongoDB is the "wiredTiger" engine, as this is a specific request in the IAP docs.

```txt
    storage:
      dbPath: /var/lib/mongo
      journal:
        enabled: true
```

3. The `processManagement` section is how the `mongod` process is dictated to run. The option to `fork` simply means it will be run in the background with no active window needed to start it.

```txt
  processManagement:
    fork: true  # fork and run in background
    pidFilePath: /var/run/mongodb/mongod.pid  # location of pidfile
    timeZoneInfo: /usr/share/zoneinfo
```

4. Arguable the most important section in the config file is the `net` section. The individual nodes in a cluster will not be ablet o communicate with eachother if their IP addresses are not added to the `bindIp` key. The IAP docs suggest using `0.0.0.0` or using the `bindIpAll` key. That way, nodes can be added and removed as needed without having to modify the config file for each node. **\*NOTE:** If the config file changes, the `mongod` process/service will need to be restarted.\*

```txt
  net:
    port: 27017
    # bindIp: localhost, <list of IP addr>
    bindIp: 0.0.0.0
    # bindIpAll: true
```

5. Because we decided to use `bindIP: 0.0.0.0` , we need a way to secure the cluster to avoid the addition of node from bad actors. MongoDB has a security field that allows for the nodes to authenticate to each other, making sure that each member has the correct keyfile before communicating with it. This is why we copy the keyfile to each node in `mongo_setup_playbook` . The keyfile was created using `openssl` :

> `openssl rand -base64 756 > <path/to/keyfile>`

```txt
  security:
    authorization: enabled
    keyFile: /var/log/mongodb/iap-keyfile
```

6. The replication section is where we specify the replica set (cluster) name. If this portion is missing, running the `rs.initiate()` command will fail.

```txt
  replication:
    replSetName: iap-cluster
```

</details>
<br/>

<details>
<summary style="font-size:30px">BREAKDOWN: restart_mongod_playbook.yml</summary>

- This playbook was created with the intenion of restarting the mongod process if anything in the config file changes.

</details>
<br/>
<details>
<summary style="font-size:30px">BREAKDOWN: uninstall_mongo_playbook.yml</summary>

- If, for any reason, the setup of MongoDB fails or was interrupted, this playbook was created to completely uninstall the MongoDB package.
- To reinstall, run `mongo_setup_playbook.yml` .

</details>
<br/>

<details>
<summary style="font-size:30px">MongoDB Cluster/Node Management</summary>

### **TO ADD A NEW MEMBER...**

- **_A replica set can have a maximum of seven voting members._** To add a member to a replica set that already has seven voting members, you must either add the member as a non-voting member or remove a vote from an existing member.
- It's preferable for new members to be fresh installs of CentOS8. If not, you will need to [remove the data directory](https://docs.mongodb.com/manual/tutorial/expand-replica-set/) on that member before adding it to the cluster, as it will copy the data from another member.
- Adding a new member must be done from the cluster _PRIMARY_. On any member:

  - Start the mongo shell using admin user `mongo -u admin` , entering the admin password when prompted.
  - To see which one is the primary, run the command `rs.status()` . Then exit the mongo shell using the `exit` command, and ssh into the primary node.
  - Once you're in the primary node, start the mongo shell by again running `mongo -u admin` .
  - Use the `rs.add()` command, passing in the member configuration object (Example below).

```js
    {
        _id: 00000, // number of cluster member
        host: "1.2.3.4:27017", // the new members IP address with port 27017
        arbiterOnly: false, // change as needed; arbiters always have 1 vote by default
        hidden: false,
        buildIndexes: true,
        priority: 10, // change as needed. Members with priority greater than 0 cannot have 0 votes.
        votes: 1 // if not specified, default is 1 even if priority is 0. Non-voting members must have priority of 0.
    }
```

### **TO UPDATE A CURRENT MEMBER...**

- Updates should first be applied to secondary nodes before the primary.
- Secondary Updates
  - In the mongo shell, shut down the mongod instance: `db.shutdownServer()`
  - Stop the mongod service: `systemctl stop mongod`
  - **Perform the needed OS or MongoDB updates.**
  - Restart daemon: `systemctl daemon-reload`
  - Confirm mongod has started: `systemctl start mongod`
  - The secondary takes time to catch up to the primary. From the mongo shell, use the `rs.status()` command to verify that the member has caught up from the `RECOVERING` state to the `SECONDARY` state.
- Primary Updates

  - To perform maintenance on the primary after completing maintenance tasks on all secondaries, connect a mongo shell to the primary and use rs.stepDown() to step down the primary and allow one of the secondaries to be elected the new primary. Specify a 300 second waiting period to prevent the member from being elected primary again for five minutes: `rs.stepDown(300)`
  - Make the following changes to the config file for the time being (Example to follow):

    1. Comment out the `replication.replSetName` option.
    2. Change the `net.port` to a different port. _Make a note of the original port setting as a comment._
    3. Set parameter `disableLogicalSessionCacheRefresh` to `true` in the --setParameter option.
    4. Restart `mongod` process: `systemctl restart mongod`
    5. Perform maintentance task on the now standalone.

    > IMPORTANT: While the member is a standalone, no writes are replicated to this member nor are writes on this member replicated to the other members of the replica set.

    6. Restart the mongod instance as a replica set member with its original configuration; that is, **undo the configuration changes** made when starting as a standalone.

```txt
net:
   bindIp: localhost,<hostname(s)|ip address(es)>
   port: 27217
#   port: 27017
#replication:
#   replSetName: shardA
setParameter:
   disableLogicalSessionCacheRefresh: true
```

_More information about updating and managing a cluster can be found at this [LINK](https://docs.mongodb.com/manual/tutorial/perform-maintence-on-replica-set-members/)._

### **TO REMOVE A MEMBER...**

- Shut down the `mongod` instance for the member you wish to remove. To shut down the instance, connect using the mongo shell and the `db.shutdownServer()` method.

- Connect to the replica set’s current primary. To determine the current primary, use `db.isMaster()` while connected to any member of the replica set.

- Use `rs.remove()` in either of the following forms to remove the member:

```js
rs.remove("<ip address or hostname>:27017");
rs.remove("<ip address or hostname>");
```

- MongoDB may disconnect the shell briefly if the replica set needs to elect a new primary. The shell then automatically reconnects in such cases. The shell may display the below error even though the command succeeds.

  > DBClientCursor::init call() failed

_More information about removing a member can be found [HERE](https://docs.mongodb.com/manual/tutorial/remove-replica-set-member/)._

</details>
<br/>
<details>
<summary style="font-size:30px">Relative File Paths</summary>

- If you fork this repo, you will need to change/modify file paths in the below loactions:
  - `ansible.cfg` --> `log_path`
  - `mongo_initiate` --> update the ip's for each member to match your cluster
  - `cluster_fig` --> either update the `bindIP` list of ip addresses, or keep it set to `0.0.0.0` .
  - `mongo_setup_playbook`
    - _"Disable THP"_ `src` path
    - _"Download MongoDB repo file"_ `src` path
    - _"reate New Config File"_ `src` path
    - _"Copy Keyfile to Node"_ `src` path

</details>
<br/>
<details>
<summary style="font-size:30px">Things left to do...</summary>

_IAP docs request the below kernel parameters to be modified, but these haven't been implemented yet. More will be added to this project to show how to take down a member in a cluster for updates without bringing down the entire cluster._

- Disable access time writes

  > Adding the `noatime` and `nodiratime` flags to the `fstab` .
  >
  > > EXAMPLE: _/dev/mapper/rhel-data /data xfs noatime, nodiratime 0 0_

- TCP keepalive time should be reduced on both the MongoDB server and MongoDB clients.

  > net.ipv4.tcp_keepalive_time = 300

- Zone Reclaim Mode should be disabled.

  > vm.zone_reclaim_mode = 0

- Increase the throughput settings.

  > net.core.somaxconn = 65535

</details>
<br/>
<details>
<summary style="font-style:italic">Footnotes</summary>

1. https://docs.itential.io/admin/Itential%20Automation%20Platform/MongoDB%20Configuration/ && https://docs.itential.io/admin/Itential%20Automation%20Platform/Installation/#post-installation-4

2. https://docs.mongodb.com/manual/tutorial/install-mongodb-on-red-hat/ && https://docs.mongodb.com/manual/tutorial/deploy-replica-set/

</details>
<br/>

---

_More playbooks will be created later for removing and adding single nodes, as well as bringing down nodes for OS config options to be installed/updated._
This README created by [Evan Boggs](https://10.10.210.1/boggsev).
