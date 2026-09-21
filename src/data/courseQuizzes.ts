import { CourseQuizQuestion } from '../types';

export const COURSE_QUIZZES: Record<string, CourseQuizQuestion[]> = {
  // mod-101: Cloud Computing & Distributed Systems
  'mod-101': [
    {
      id: 'cc-1',
      question: "According to the CAP theorem in distributed systems, what does the 'P' stand for and what is guaranteed during a network partition?",
      options: [
        'Partition Tolerance: the system continues to operate despite arbitrary message loss or network delay, requiring a trade-off between Consistency and Availability.',
        'Performance: the cluster automatically increases throughput when nodes disconnect.',
        'Persistence: data is guaranteed to never be lost from hard drives during power outages.',
        'Parallelism: distributed tasks are divided equally among remaining active instances.'
      ],
      correctAnswer: 0,
      explanation: 'CAP theorem states that in the presence of a network partition (P), a distributed system must choose between Consistency (C) and Availability (A).'
    },
    {
      id: 'cc-2',
      question: 'In distributed consensus algorithms like Raft, what is the primary role of the Leader node?',
      options: [
        'It terminates slow follower instances across the cluster.',
        'It manages log replication to follower nodes and responds to client requests.',
        'It generates public-private key pairs for inter-node TLS communication.',
        'It converts SQL queries into distributed map-reduce jobs.'
      ],
      correctAnswer: 1,
      explanation: 'In Raft, the elected leader accepts log entries from clients, replicates them across followers, and tells followers when it is safe to apply them to their state machines.'
    },
    {
      id: 'cc-3',
      question: 'What is the core difference between horizontal scaling (scaling out) and vertical scaling (scaling up)?',
      options: [
        'Horizontal scaling moves data to cold storage; vertical scaling caches it in Redis.',
        'Horizontal scaling adds more instances/nodes to the pool; vertical scaling adds more CPU/RAM resources to a single instance.',
        'Horizontal scaling only works on private cloud; vertical scaling works on public cloud.',
        'Horizontal scaling decreases network bandwidth; vertical scaling reduces disk I/O.'
      ],
      correctAnswer: 1,
      explanation: 'Horizontal scaling (scale-out) increases capacity by adding more compute nodes, while vertical scaling (scale-up) adds more hardware resources (CPU, RAM, storage) to existing machines.'
    },
    {
      id: 'cc-4',
      question: 'Which cloud computing service model provides hardware virtualization, networking, and storage where the user manages the OS and runtime?',
      options: [
        'SaaS (Software as a Service)',
        'PaaS (Platform as a Service)',
        'IaaS (Infrastructure as a Service)',
        'FaaS (Function as a Service)'
      ],
      correctAnswer: 2,
      explanation: 'IaaS (e.g., AWS EC2, GCP Compute Engine) delivers raw computing infrastructure where users are responsible for OS configuration, patches, runtimes, and applications.'
    },
    {
      id: 'cc-5',
      question: 'What mechanism does an Object Storage system (like AWS S3 or Google Cloud Storage) use instead of a traditional hierarchical file system tree?',
      options: [
        'Flat namespace addressing objects via unique keys and buckets with associated metadata.',
        'Hard links on an ext4 root mount point.',
        'B-tree directory inodes mapped directly to physical spinning platters.',
        'A single global FAT32 allocation table.'
      ],
      correctAnswer: 0,
      explanation: 'Object storage uses flat namespaces where files (objects) are stored in buckets and referenced by unique URI keys with customizable key-value metadata rather than directory hierarchies.'
    },
    {
      id: 'cc-6',
      question: "In distributed caching architectures, what is the 'Cache-Aside' (Lazy Loading) pattern?",
      options: [
        'The cache automatically pre-warms itself every midnight.',
        'The application first checks the cache; if not found (cache miss), it queries the database and populates the cache.',
        'The database writes directly to the cache synchronously on every UPDATE query.',
        'The cache periodically purges 100% of its keys to prevent memory leaks.'
      ],
      correctAnswer: 1,
      explanation: 'In Cache-Aside, the application inspects the cache first. Upon a miss, it loads the data from the datastore, stores it in the cache for subsequent requests, and returns it.'
    },
    {
      id: 'cc-7',
      question: "What does 'Eventual Consistency' mean in distributed databases such as DynamoDB or Apache Cassandra?",
      options: [
        'Transactions will eventually fail if network latency exceeds 500ms.',
        'Given no new updates, all replicas will eventually converge and return the identical, latest value.',
        'Read operations are blocked indefinitely until an administrator issues a flush command.',
        'Data is written to tape drives and reconciled once every 24 hours.'
      ],
      correctAnswer: 1,
      explanation: 'Eventual consistency guarantees that if no new updates are made to a given data item, eventually all accesses will return the last updated value.'
    },
    {
      id: 'cc-8',
      question: 'Which component is responsible for distributing incoming traffic evenly across multiple backend server instances to prevent overloading any single server?',
      options: [
        'Reverse Proxy / Load Balancer',
        'NAT Gateway',
        'Database Write-Ahead Log (WAL)',
        'DHCP Server'
      ],
      correctAnswer: 0,
      explanation: 'Load balancers (e.g. NGINX, AWS ALB) distribute incoming network or application traffic across healthy backend server instances using algorithms like Round Robin or Least Connections.'
    },
    {
      id: 'cc-9',
      question: 'What is the primary advantage of a stateless application architecture in cloud deployments?',
      options: [
        'It eliminates the need for database backups entirely.',
        'Any request can be handled by any available application instance, making horizontal autoscaling straightforward.',
        'Stateless services do not consume any RAM or CPU during execution.',
        'Stateless instances can run without an operating system kernel.'
      ],
      correctAnswer: 1,
      explanation: 'Stateless instances store no client session state locally; any server can process any request, allowing the cluster to scale in or out seamlessly according to traffic demands.'
    },
    {
      id: 'cc-10',
      question: 'What technique is used in distributed hashing to minimize data remapping when nodes are added or removed from a cache cluster?',
      options: [
        'Linear probing',
        'Consistent Hashing (Hash Ring)',
        'Modulo arithmetic (hash(key) % N)',
        'Breadth-First Traversal'
      ],
      correctAnswer: 1,
      explanation: 'Consistent hashing maps both keys and servers onto a circular ring, ensuring that when a node is added or removed, only K/N keys need to be remapped on average.'
    }
  ],

  // mod-102: Hands-on Docker Containerization & Microservices
  'mod-102': [
    {
      id: 'dk-1',
      question: 'What Linux kernel features do Docker containers leverage under the hood for process isolation and resource limitation?',
      options: [
        'Namespaces (for isolation of PID, NET, IPC, MNT) and cgroups (for CPU, memory, and I/O resource limits).',
        'Hardware Hypervisor Type-1 extensions and BIOS VT-d.',
        'CRON daemon schedules and SysV init scripts.',
        'SELinux policies only, without kernel-level process segregation.'
      ],
      correctAnswer: 0,
      explanation: 'Containers are Linux processes isolated using kernel Namespaces (PID, Mount, Net, IPC, UTS) and restricted in resource consumption via Control Groups (cgroups).'
    },
    {
      id: 'dk-2',
      question: 'Consider this Dockerfile instruction. What is the key advantage of using multi-stage builds?',
      codeSnippet: 'FROM node:18-alpine AS builder\nWORKDIR /app\nCOPY . .\nRUN npm run build\n\nFROM nginx:alpine\nCOPY --from=builder /app/dist /usr/share/nginx/html',
      options: [
        'It speeds up JavaScript execution in production by 300%.',
        'It produces a minimal final production image by excluding source code, node_modules, and build compilers.',
        'It allows running multiple independent operating systems in one container.',
        'It automatically configures SSL certificates inside NGINX.'
      ],
      correctAnswer: 1,
      explanation: 'Multi-stage builds allow isolating the heavy build environment and copying only the compiled production artifacts into a lightweight runtime image, minimizing image size and attack surface.'
    },
    {
      id: 'dk-3',
      question: 'What is the crucial difference between the ENTRYPOINT and CMD instructions in a Dockerfile?',
      options: [
        'ENTRYPOINT specifies the default executable that always runs; CMD provides default arguments that can be easily overridden from the CLI.',
        'CMD can only be executed as root; ENTRYPOINT runs as a non-privileged user.',
        'ENTRYPOINT is only evaluated at build time; CMD is evaluated at push time.',
        'There is no difference; they are exact aliases for each other.'
      ],
      correctAnswer: 0,
      explanation: 'ENTRYPOINT sets the binary to execute, while CMD provides default parameters. When arguments are passed to docker run, they override CMD but append to ENTRYPOINT.'
    },
    {
      id: 'dk-4',
      question: "How does Docker's copy-on-write (CoW) layered storage driver (overlay2) optimize disk usage when multiple containers run the same image?",
      options: [
        'It encrypts container disk drives using AES-256 blocks.',
        'All containers share the read-only image layers; a thin writable container layer is added on top only for modified files.',
        'It clones the entire 2GB disk image for each container launched.',
        'It converts all images into RAM-only tmpfs mounts.'
      ],
      correctAnswer: 1,
      explanation: 'Overlay2 allows all containers instantiated from the same image to share the immutable underlying image layers. Each container only writes changes to its own thin read-write layer.'
    },
    {
      id: 'dk-5',
      question: 'Which docker run flag maps container port 80 to host machine port 8080?',
      options: [
        'docker run -p 8080:80 my-app',
        'docker run -p 80:8080 my-app',
        'docker run --expose 8080 my-app',
        'docker run -v 8080:80 my-app'
      ],
      correctAnswer: 0,
      explanation: 'The syntax for port binding is -p <host_port>:<container_port>. Thus -p 8080:80 routes traffic arriving at host port 8080 into container port 80.'
    },
    {
      id: 'dk-6',
      question: 'What is the purpose of the .dockerignore file in the build context root?',
      options: [
        'It tells the container runtime which ports to block from incoming connections.',
        'It prevents specified files/directories (e.g. node_modules, .git, secrets) from being uploaded to the Docker daemon build context.',
        'It silences stdout logging from running containers.',
        'It defines which container images cannot be pulled from Docker Hub.'
      ],
      correctAnswer: 1,
      explanation: '.dockerignore prevents copying unnecessary, large, or sensitive local files into the Docker build daemon context, speeding up builds and reducing image bloat.'
    },
    {
      id: 'dk-7',
      question: 'Why is it considered a major container security anti-pattern to run containers as the default root user (UID 0)?',
      options: [
        'Root containers cannot access TCP networking sockets.',
        'If an attacker escapes the container through a kernel vulnerability, they obtain root privileges on the host OS.',
        'Root processes cannot write to Docker named volumes.',
        'Docker engines automatically throttle CPU for root processes.'
      ],
      correctAnswer: 1,
      explanation: 'Unless user namespaces are explicitly mapped, container root (UID 0) matches host root (UID 0). A container breakout vulnerability gives the attacker immediate root access to the host machine.'
    },
    {
      id: 'dk-8',
      question: 'In Docker Compose, what does the depends_on attribute ensure when starting multiple service containers?',
      options: [
        'It guarantees the dependent database is fully initialized and accepting socket connections before the web app starts.',
        'It ensures containers are started in the specified dependency order, although it does not wait for application-level readiness without healthchecks.',
        'It compiles the source code of both services simultaneously.',
        'It merges the two container file systems into a single united container.'
      ],
      correctAnswer: 1,
      explanation: 'depends_on controls container startup order (starts db container before web container), but does not wait for the application inside (like Postgres ready) unless paired with a healthcheck condition.'
    },
    {
      id: 'dk-9',
      question: 'What type of Docker volume is stored on the host filesystem at a specific user-defined absolute path (e.g., -v /home/user/app:/app)?',
      options: [
        'Anonymous Volume',
        'Named Volume',
        'Bind Mount',
        'tmpfs Mount'
      ],
      correctAnswer: 2,
      explanation: 'A bind mount maps a specific file or directory on the host machine to a target path inside the container, commonly used for local development live-reloading.'
    },
    {
      id: 'dk-10',
      question: 'How do you inspect the exit code, IP address, and volume bindings of a stopped Docker container via the CLI?',
      options: [
        'docker inspect <container_id>',
        'docker logs --details <container_id>',
        'docker scan <container_id>',
        'docker top <container_id>'
      ],
      correctAnswer: 0,
      explanation: 'docker inspect returns low-level JSON configuration and state metadata of Docker containers, images, volumes, and networks, including exit codes and network settings.'
    }
  ],

  // mod-103: Kubernetes Pods, Services & Ingress Orchestration
  'mod-103': [
    {
      id: 'k8s-1',
      question: 'What is the smallest deployable computing unit in Kubernetes that can contain one or more tightly coupled containers?',
      options: [
        'ReplicaSet',
        'Pod',
        'Deployment',
        'Node'
      ],
      correctAnswer: 1,
      explanation: 'A Pod is the basic execution unit in Kubernetes, encapsulating one or more containers that share storage volumes, an IP address, and IPC namespace.'
    },
    {
      id: 'k8s-2',
      question: 'Which Kubernetes Service type provisions an external cloud load balancer (e.g. AWS NLB, GCP Load Balancer) with an externally accessible IP address?',
      options: [
        'ClusterIP',
        'NodePort',
        'LoadBalancer',
        'ExternalName'
      ],
      correctAnswer: 2,
      explanation: "Service type 'LoadBalancer' integrates with the cloud provider to allocate an external IP and route internet traffic directly through the cluster nodes to the backend pods."
    },
    {
      id: 'k8s-3',
      question: 'What is the difference between a Liveness Probe and a Readiness Probe in a Kubernetes pod specification?',
      options: [
        'Liveness probes determine if a container should be restarted; Readiness probes determine if a container is ready to receive network traffic from Services.',
        'Liveness probes monitor CPU load; Readiness probes monitor memory usage.',
        'Liveness probes run only during image pulling; Readiness probes run only during pod deletion.',
        'Liveness probes scale the pod; Readiness probes log error messages.'
      ],
      correctAnswer: 0,
      explanation: 'Liveness probes detect if a process is deadlocked and restart it. Readiness probes determine if a pod is initialized and healthy enough to accept incoming network traffic.'
    },
    {
      id: 'k8s-4',
      question: 'Which Kubernetes control plane component is the persistent, highly-available key-value store that holds the entire cluster state?',
      options: [
        'kube-apiserver',
        'kube-scheduler',
        'etcd',
        'kube-controller-manager'
      ],
      correctAnswer: 2,
      explanation: "etcd is a consistent and highly-available key-value store used as Kubernetes' backing store for all cluster data and resource configurations."
    },
    {
      id: 'k8s-5',
      question: 'What Kubernetes object manages HTTP and HTTPS routing from outside the cluster to internal Services based on hostnames and paths?',
      options: [
        'Ingress (managed by an Ingress Controller like NGINX Ingress)',
        'ConfigMap',
        'PersistentVolumeClaim',
        'DaemonSet'
      ],
      correctAnswer: 0,
      explanation: 'An Ingress exposes HTTP and HTTPS routes from outside the cluster to services within the cluster, offering path-based routing, SSL termination, and name-based virtual hosting.'
    },
    {
      id: 'k8s-6',
      question: 'What controller ensures that a copy of a specific pod runs across ALL (or selected) worker nodes in a cluster (commonly used for log collectors and monitoring agents)?',
      options: [
        'StatefulSet',
        'Deployment',
        'DaemonSet',
        'Job'
      ],
      correctAnswer: 2,
      explanation: 'A DaemonSet ensures that all (or some) Nodes run a copy of a Pod. When nodes are added to the cluster, Pods are automatically added to them.'
    },
    {
      id: 'k8s-7',
      question: 'In Kubernetes deployments, what strategy gradually replaces old version pods with new version pods without application downtime?',
      options: [
        'Recreate',
        'RollingUpdate (configured with maxSurge and maxUnavailable)',
        'Hard Cutover',
        'KillAndReplace'
      ],
      correctAnswer: 1,
      explanation: 'The RollingUpdate deployment strategy incrementally updates Pods instances with new versions, preventing downtime by ensuring a minimum number of healthy pods remain active.'
    },
    {
      id: 'k8s-8',
      question: 'How do pods locate other services inside the same Kubernetes cluster without knowing their dynamic IP addresses?',
      options: [
        'Via CoreDNS / Cluster DNS using standard FQDNs (e.g. <service-name>.<namespace>.svc.cluster.local)',
        'By scanning the subnet using ARP broadcast packets every 10 seconds',
        'By reading hardcoded IP addresses from /etc/hosts manually modified by engineers',
        'Through multicast ping requests'
      ],
      correctAnswer: 0,
      explanation: 'Kubernetes deploys an internal DNS service (CoreDNS) which automatically creates DNS A/SRV records for each Service, allowing pods to resolve services by name.'
    },
    {
      id: 'k8s-9',
      question: 'What is the purpose of a Horizontal Pod Autoscaler (HPA)?',
      options: [
        'It dynamically increases the RAM size allocated to physical node servers.',
        'It automatically scales the number of pod replicas up or down based on observed metrics like CPU, memory, or custom metrics.',
        'It migrates pods between AWS and GCP clouds based on spot pricing.',
        'It reboots failed master nodes.'
      ],
      correctAnswer: 1,
      explanation: 'The Horizontal Pod Autoscaler automatically updates a workload resource (like a Deployment or StatefulSet) to adjust the number of pod replicas to match target utilization.'
    },
    {
      id: 'k8s-10',
      question: 'What Kubernetes resource provides a way to store non-confidential configuration data as key-value pairs and inject them into containers as environment variables or volume files?',
      options: [
        'Secret',
        'ConfigMap',
        'PersistentVolume',
        'ServiceAccount'
      ],
      correctAnswer: 1,
      explanation: 'ConfigMaps decouple environment-specific configuration artifacts from container image content, making applications portable across development, staging, and production.'
    }
  ],

  // mod-201: GitHub Actions: Automated Continuous Integration
  'mod-201': [
    {
      id: 'gha-1',
      question: 'In which repository directory must GitHub Actions workflow YAML files be placed to be recognized and triggered by GitHub?',
      options: [
        '.github/workflows/',
        '.ci/pipelines/',
        'config/github-actions/',
        '.actions/runners/'
      ],
      correctAnswer: 0,
      explanation: 'GitHub looks for workflow files defined in YAML inside the .github/workflows directory of the repository.'
    },
    {
      id: 'gha-2',
      question: 'Examine this snippet. What triggers this workflow execution?',
      codeSnippet: "on:\n  push:\n    branches: [ 'main' ]\n  pull_request:\n    branches: [ 'main' ]",
      options: [
        'Commits pushed to any branch or PR opened on any branch.',
        'Commits pushed to main branch, or pull requests targeting the main branch.',
        'Only scheduled cron triggers running at midnight.',
        'Manual dispatch triggers executed by admins.'
      ],
      correctAnswer: 1,
      explanation: "The 'on' trigger specifies that the workflow fires whenever commits are pushed to 'main' or when a PR with base branch 'main' is created or updated."
    },
    {
      id: 'gha-3',
      question: 'What is the purpose of actions/checkout@v4 in a GitHub Actions job step?',
      options: [
        'It checks out the repository source code onto the GitHub runner so subsequent build/test steps can access it.',
        'It authorizes credit card payments for GitHub enterprise billing.',
        'It verifies that the committer has signed the Contributor License Agreement (CLA).',
        'It publishes npm packages directly to the npm registry.'
      ],
      correctAnswer: 0,
      explanation: 'actions/checkout is standard boilerplate that clones the repository branch onto the workflow runner filesystem ($GITHUB_WORKSPACE).'
    },
    {
      id: 'gha-4',
      question: 'How should sensitive production credentials (such as AWS_SECRET_ACCESS_KEY or DOCKER_PASSWORD) be passed securely into a GitHub Actions step?',
      options: [
        'Hardcode them as cleartext environment variables in the workflow YAML.',
        'Commit them in a config.json file in the root of the repository.',
        'Reference them from repository Encrypted Secrets via ${{ secrets.SECRET_NAME }}.',
        'Print them to workflow console logs using echo.'
      ],
      correctAnswer: 2,
      explanation: 'Secrets stored in GitHub Repository/Organization settings are encrypted at rest and automatically masked in workflow logs when referenced via ${{ secrets.<NAME> }}.'
    },
    {
      id: 'gha-5',
      question: 'What is a GitHub Actions Matrix Strategy used for?',
      options: [
        'Calculating multi-dimensional database tensors.',
        'Running a job simultaneously across multiple variations of operating systems, platforms, or language runtime versions (e.g. Node 18, 20 on Ubuntu and Windows).',
        'Visualizing pull request merge trees in 3D.',
        'Rotating encryption keys across cloud accounts.'
      ],
      correctAnswer: 1,
      explanation: 'A matrix strategy allows parameterizing jobs across arrays of variables (e.g., node-version: [18, 20, 22], os: [ubuntu-latest, macos-latest]), generating parallel job combinations.'
    },
    {
      id: 'gha-6',
      question: 'What happens by default if one step in a GitHub Actions job fails (exits with non-zero code)?',
      options: [
        'Subsequent steps in that job are skipped immediately, unless conditioned with if: always() or if: failure().',
        'GitHub re-runs the entire repository history from the first commit.',
        'The runner reboots and retries the failed step indefinitely.',
        'The repository is placed in read-only mode.'
      ],
      correctAnswer: 0,
      explanation: 'By default, any step that exits with a non-zero code halts subsequent steps in that job, unless steps have conditions such as if: always() or continue-on-error: true.'
    },
    {
      id: 'gha-7',
      question: 'How do you share build artifacts (e.g. compiled dist/ folders, coverage reports) between different jobs in the same workflow run?',
      options: [
        'Send them via email using sendmail.',
        'Use actions/upload-artifact in the producer job and actions/download-artifact in the consumer job.',
        'Jobs share the same persistent hard drive automatically across all runner machines.',
        'Write them to /tmp/ and read them from the other machine.'
      ],
      correctAnswer: 1,
      explanation: "Because jobs run on isolated virtual machines or containers, files must be uploaded to GitHub's artifact storage via actions/upload-artifact and retrieved via actions/download-artifact."
    },
    {
      id: 'gha-8',
      question: 'What is the utility of actions/cache@v4 in continuous integration pipelines?',
      options: [
        'It speeds up workflows by persisting package manager dependencies (e.g., ~/.npm or .m2/repository) between workflow runs using cache keys.',
        'It caches user browser sessions on the production web server.',
        'It stores compiled binary files permanently on GitHub releases.',
        'It prevents git push commands if tests are failing.'
      ],
      correctAnswer: 0,
      explanation: "actions/cache caches package dependencies across runs matching a cache key (such as hashFiles('**/package-lock.json')), drastically reducing npm install / pip install times."
    },
    {
      id: 'gha-9',
      question: 'What is the difference between a GitHub-hosted runner and a Self-hosted runner?',
      options: [
        'GitHub-hosted runners are ephemeral clean VMs managed by GitHub; Self-hosted runners are physical or virtual servers managed and customized on your own infrastructure.',
        'GitHub-hosted runners only support Python; Self-hosted runners only support C++.',
        'Self-hosted runners cannot run Docker commands.',
        'GitHub-hosted runners charge per line of YAML code written.'
      ],
      correctAnswer: 0,
      explanation: 'GitHub-hosted runners are maintained and updated by GitHub with clean states per run. Self-hosted runners allow organizations to run workflows on internal hardware with custom tooling and networking.'
    },
    {
      id: 'gha-10',
      question: 'How can you manually trigger a GitHub Actions workflow on-demand with custom input parameters from the GitHub UI?',
      options: [
        "Using the workflow_dispatch trigger with defined input fields.",
        "Renaming the master branch to 'run-now'.",
        'Sending a POST request to gitlab-ci.yml.',
        'Opening and closing an issue 3 times.'
      ],
      correctAnswer: 0,
      explanation: "The workflow_dispatch trigger enables the 'Run workflow' button in the Actions UI and accepts user-supplied string, boolean, or choice inputs."
    }
  ],

  // mod-202: Test-Driven Development (TDD) with Jest & PyTest
  'mod-202': [
    {
      id: 'tdd-1',
      question: 'What are the three canonical phases in the Test-Driven Development (TDD) Red-Green-Refactor cycle?',
      options: [
        'Write a failing test (Red) -> Write minimum code to make it pass (Green) -> Clean up design without changing behavior (Refactor).',
        'Commit to Git (Red) -> Push to main (Green) -> Deploy to production (Refactor).',
        'Define database schema (Red) -> Write API endpoints (Green) -> Run linter (Refactor).',
        'Log errors (Red) -> Fix bugs (Green) -> Delete unit tests (Refactor).'
      ],
      correctAnswer: 0,
      explanation: 'The Red-Green-Refactor cycle mandates writing tests before implementation: first see it fail (Red), write minimal code to pass (Green), then improve structure and elegance (Refactor).'
    },
    {
      id: 'tdd-2',
      question: 'In Jest, how do you verify that an asynchronous function throws a specific error when invoked?',
      codeSnippet: "async function fetchUser(id) {\n  if (!id) throw new Error('User ID required');\n}",
      options: [
        "await expect(fetchUser(null)).rejects.toThrow('User ID required');",
        "expect(fetchUser(null)).toBe('User ID required');",
        'try { fetchUser(null); } catch (e) { expect(e).toBeNull(); }',
        'assert.equal(fetchUser(null), false);'
      ],
      correctAnswer: 0,
      explanation: 'For async promises or async functions in Jest, await expect(promise).rejects.toThrow() is the canonical matcher for asserting rejected errors.'
    },
    {
      id: 'tdd-3',
      question: "In PyTest, what are 'fixtures' (decorated with @pytest.fixture) primarily used for?",
      options: [
        'Displaying graphical charts of test results in the terminal.',
        'Providing reliable, reusable baseline setups and teardowns (e.g. database connections, mock clients, test datasets) to test functions.',
        'Automatically fixing syntax errors in Python code.',
        'Compiling Python bytecode into native C binaries.'
      ],
      correctAnswer: 1,
      explanation: 'PyTest fixtures manage setup, dependencies, and teardown logic for test suites, passed cleanly into test functions via dependency injection.'
    },
    {
      id: 'tdd-4',
      question: 'What is the testing pyramid concept proposed by Mike Cohn, and how should test suites be distributed?',
      options: [
        'Large base of fast Unit Tests -> Moderate layer of Integration Tests -> Small apex of End-to-End (E2E) / UI Tests.',
        '100% E2E tests and zero unit tests to maximize real user simulation.',
        'Equal number of unit, integration, and manual QA tests.',
        'Mostly performance load tests with occasional syntax checks.'
      ],
      correctAnswer: 0,
      explanation: 'The testing pyramid advocates for a solid foundation of comprehensive, fast, isolated unit tests, fewer integration tests, and very few costly, slower E2E tests.'
    },
    {
      id: 'tdd-5',
      question: 'What is the difference between a Mock and a Stub in automated testing?',
      options: [
        'Stubs provide canned answers to calls made during the test; Mocks verify expectations on interactions (e.g. asserting a function was called with exact arguments).',
        'Mocks run only in Python; Stubs run only in JavaScript.',
        'Stubs are stored in the database; Mocks are stored in memory.',
        'There is no technical distinction between Mocks and Stubs.'
      ],
      correctAnswer: 0,
      explanation: 'Stubs provide pre-programmed data to queries without verifying call counts or args. Mocks focus on behavior verification: asserting that specific calls were made.'
    },
    {
      id: 'tdd-6',
      question: 'In PyTest, which decorator allows running the exact same test function with multiple sets of inputs and expected outputs?',
      options: [
        "@pytest.mark.parametrize('input, expected', [(1, 2), (2, 4), (3, 6)])",
        '@pytest.mark.repeat(3)',
        '@pytest.mark.loop(inputs)',
        '@pytest.mark.table_test'
      ],
      correctAnswer: 0,
      explanation: '@pytest.mark.parametrize enables data-driven testing by executing the test function once for each parameter tuple in the list.'
    },
    {
      id: 'tdd-7',
      question: 'What does 100% Code Line Coverage guarantee about software quality?',
      options: [
        'It guarantees the code is completely bug-free and handles all edge cases.',
        'It only proves every line was executed during tests; it does NOT prove correct business logic, missing edge cases, or exception handling under concurrent load.',
        'It guarantees security against SQL injection and XSS attacks.',
        'It guarantees that memory leaks cannot occur in production.'
      ],
      correctAnswer: 1,
      explanation: 'High coverage indicates lines were reached, but tests may lack meaningful assertions, miss null/empty edge cases, or fail to validate unexpected input permutations.'
    },
    {
      id: 'tdd-8',
      question: "In Jest, what does jest.spyOn(object, 'methodName') accomplish?",
      options: [
        'It replaces the entire operating system process with a sandbox.',
        'It tracks calls, arguments, and return values of an existing method while optionally preserving or mocking its original implementation.',
        'It permanently deletes the method from memory.',
        'It records audio from the developer microphone.'
      ],
      correctAnswer: 1,
      explanation: 'jest.spyOn wraps an existing object method to spy on its calls, allowing assertions like expect(spy).toHaveBeenCalledWith(...) while allowing mockImplementation() overrides.'
    },
    {
      id: 'tdd-9',
      question: "What is a 'Flaky Test' and why is it dangerous in CI/CD pipelines?",
      options: [
        'A test that passes or fails non-deterministically without any code changes (e.g. due to race conditions or timing), eroding developer trust in CI results.',
        'A test that takes less than 1 millisecond to execute.',
        'A test written without comments.',
        'A test that only runs on Fridays.'
      ],
      correctAnswer: 0,
      explanation: 'Flaky tests exhibit intermittent pass/fail behavior due to timing, unmocked network calls, or shared state. They undermine trust in CI pipelines, causing real regressions to be ignored.'
    },
    {
      id: 'tdd-10',
      question: "In modern testing practices, what is 'Mutation Testing'?",
      options: [
        'Testing biological DNA sequences in medical software.',
        'Introducing deliberate bugs (mutations) into production code to verify if the test suite catches them (evaluating test suite quality).',
        'Renaming test files dynamically during runtime.',
        'Overwriting variables in memory without locks.'
      ],
      correctAnswer: 1,
      explanation: 'Mutation testing alters code statements (e.g. > to <, + to -) and runs tests. If tests still pass, the mutant survived, revealing weak or missing test assertions.'
    }
  ],

  // mod-301: Scalable Microservices Architecture
  'mod-301': [
    {
      id: 'ms-1',
      question: "What design pattern isolates database storage per microservice so services cannot directly query each other's tables?",
      options: [
        'Shared Database Pattern',
        'Database per Service Pattern',
        'Global Singleton Schema Pattern',
        'Raw Disc Mount Pattern'
      ],
      correctAnswer: 1,
      explanation: 'Database per Service ensures loose coupling and autonomous deployments: each microservice owns its private datastore, accessible only via public APIs or events.'
    },
    {
      id: 'ms-2',
      question: 'In distributed microservice architectures where distributed 2-phase commits (2PC) are avoided, how is data consistency across multiple services managed?',
      options: [
        'The SAGA Pattern (choreography or orchestration with compensating transactions).',
        'Periodic full database restoration from tape backups.',
        'Global distributed mutex locks over HTTP.',
        'Manual database edits by system administrators.'
      ],
      correctAnswer: 0,
      explanation: 'The Saga pattern executes a series of local transactions across services; if a step fails, compensating transactions are executed to undo earlier operations.'
    },
    {
      id: 'ms-3',
      question: 'What is the role of the Circuit Breaker pattern (e.g., Netflix Hystrix, Resilience4j)?',
      options: [
        'It cuts physical power cables when servers overheat.',
        'It detects recurring remote service failures and immediately fails fast without executing requests, preventing cascading resource exhaustion across the system.',
        'It accelerates database queries using GPU cores.',
        'It prevents users from logging in during nighttime hours.'
      ],
      correctAnswer: 1,
      explanation: 'Circuit breakers wrap protected calls. When failure rates exceed a threshold, the breaker opens, failing fast to prevent cascading failures and allowing downstream services time to recover.'
    },
    {
      id: 'ms-4',
      question: "What is an API Gateway's primary responsibility in microservices?",
      options: [
        'Compiling frontend TypeScript code into WebAssembly.',
        'Serving as a single reverse proxy entrypoint that handles routing, authentication, rate limiting, and request aggregation for client applications.',
        'Storing database tables and running daily cron backups.',
        'Assigning IP addresses to office workstations.'
      ],
      correctAnswer: 1,
      explanation: 'An API Gateway (e.g. Kong, Apigee, AWS API Gateway) acts as the unified reverse proxy facade for clients, managing authentication, TLS, routing, and rate limits.'
    },
    {
      id: 'ms-5',
      question: 'What technique in distributed tracing allows tracking a single user request as it traverses 10 different microservices?',
      options: [
        'Propagating a unique Correlation ID / Trace ID in HTTP headers (W3C TraceContext) through all downstream service calls.',
        'Printing the server hostname to the console.',
        'Having all services write to a single text file on a shared flash drive.',
        'Running all services inside a single thread.'
      ],
      correctAnswer: 0,
      explanation: 'Distributed tracing (e.g., OpenTelemetry, Jaeger) relies on injecting and extracting Trace IDs across HTTP/gRPC headers so logs and spans across disparate nodes can be correlated.'
    },
    {
      id: 'ms-6',
      question: 'What is the core difference between Orchestration and Choreography in microservices saga workflows?',
      options: [
        'Orchestration uses a centralized coordinator directing participants; Choreography relies on services reacting independently to published domain events.',
        'Orchestration is synchronous; Choreography is always written in Python.',
        'Orchestration requires Kubernetes; Choreography requires bare metal servers.',
        'Orchestration is deprecated in modern systems.'
      ],
      correctAnswer: 0,
      explanation: 'Orchestration utilizes a central engine (like Temporal or Camunda) telling services what to do next. Choreography relies on distributed pub/sub event brokers without a central coordinator.'
    },
    {
      id: 'ms-7',
      question: "What is the 'Strangler Fig' pattern when refactoring monolithic systems into microservices?",
      options: [
        'Shutting down the monolith abruptly over a single weekend.',
        'Gradually replacing specific monolithic features by routing requests to new microservices until the legacy monolith can be safely decommissioned.',
        'Wrapping the monolith in Docker without any code modifications.',
        'Rewriting all backend code in Assembly.'
      ],
      correctAnswer: 1,
      explanation: 'The Strangler Fig pattern incrementally migrates legacy systems by placing a proxy in front and peeling away services one by one until the monolith is replaced.'
    },
    {
      id: 'ms-8',
      question: 'Why is gRPC often preferred over standard REST/JSON for inter-service communication between internal backend microservices?',
      options: [
        'It uses compact binary protocol buffers (Protobuf) over HTTP/2 with multiplexing and strict contract schemas, yielding lower latency and higher throughput.',
        'It eliminates the need for computer networking.',
        'It automatically handles database indexing.',
        'It can only be used by web browsers.'
      ],
      correctAnswer: 0,
      explanation: 'gRPC utilizes HTTP/2 and binary Protobuf serialization, offering bidirectional streaming, header compression, and compact payloads that significantly outperform verbose REST JSON.'
    },
    {
      id: 'ms-9',
      question: 'What is the CQRS (Command Query Responsibility Segregation) architectural pattern?',
      options: [
        'Separating read operations (queries) from write operations (commands), often with optimized, distinct data models and databases for each.',
        'Encrypting passwords using two separate secret keys.',
        'Requiring two engineers to approve every database query.',
        'Running queries only on weekends and commands on weekdays.'
      ],
      correctAnswer: 0,
      explanation: 'CQRS segregates write models (handling business rules and validations) from read models (denormalized and highly optimized for read performance).'
    },
    {
      id: 'ms-10',
      question: 'What is the Transactional Outbox pattern used for in event-driven microservices?',
      options: [
        'Storing emails in an IMAP folder before delivery.',
        'Atomically saving domain entities and outgoing event messages in the same local database transaction to guarantee reliable message publishing.',
        'Encrypting disk volumes using hardware security modules.',
        'Cancelling payment charges after 30 days.'
      ],
      correctAnswer: 1,
      explanation: 'Transactional Outbox solves dual-write distributed failures by committing the domain change and an outbox message record in a single database transaction, ensuring events are reliably delivered.'
    }
  ]
};

export function getQuizForModule(moduleId: string, moduleTitle: string): CourseQuizQuestion[] {
  if (COURSE_QUIZZES[moduleId] && COURSE_QUIZZES[moduleId].length === 10) {
    return COURSE_QUIZZES[moduleId];
  }

  // Robust fallback 10 questions customized to the module title if non-standard ID
  return [
    {
      id: `${moduleId}-q1`,
      question: `In enterprise deployments of ${moduleTitle}, what is the foundational design principle?`,
      options: [
        'Separation of concerns, defense-in-depth security, and modular decoupling.',
        'Storing all configuration in plaintext on shared network drives.',
        'Monolithic single-process execution without observability.',
        'Bypassing automated testing in staging environments.'
      ],
      correctAnswer: 0,
      explanation: 'Modern production architectures prioritize separation of concerns, strict decoupling, and zero-trust security postures.'
    },
    {
      id: `${moduleId}-q2`,
      question: `Which error handling strategy ensures resilient fault tolerance in ${moduleTitle}?`,
      options: [
        'Exponential backoff with jitter and circuit breaker protection.',
        'Silently ignoring unhandled rejections and terminating background workers.',
        'Restarting the physical host server on every 5xx error.',
        'Synchronously polling endpoints in infinite while(true) loops.'
      ],
      correctAnswer: 0,
      explanation: 'Exponential backoff with jitter avoids thundering herd problems, and circuit breakers stop cascading failures.'
    },
    {
      id: `${moduleId}-q3`,
      question: `What role does automated regression testing play in the lifecycle of ${moduleTitle}?`,
      options: [
        'Validates contract schemas, maintains reliability, and catches regressions early in CI/CD.',
        'Increases code deployment latency unnecessarily.',
        'Replaces production monitoring entirely.',
        'Generates automated documentation only.'
      ],
      correctAnswer: 0,
      explanation: 'Continuous regression testing provides immediate verification that updates do not break contracts or core business logic.'
    },
    {
      id: `${moduleId}-q4`,
      question: `How should security credentials and API tokens be managed in ${moduleTitle}?`,
      options: [
        'Injected at runtime via dedicated secret managers or environment variables with strict least-privilege access.',
        'Committed directly to public Git repositories for easy developer access.',
        'Saved as hardcoded constants inside client-side bundles.',
        'Stored unencrypted in browser localStorage.'
      ],
      correctAnswer: 0,
      explanation: 'Secrets should never be versioned in code; they must be managed securely and injected at runtime via secret stores.'
    },
    {
      id: `${moduleId}-q5`,
      question: `Which monitoring metric provides the best indicator of service degradation in ${moduleTitle}?`,
      options: [
        'P99 latency, HTTP error rate (5xx), and resource saturation metrics.',
        'Total lines of source code in the repository.',
        'The physical weight of the rack server.',
        'The number of comments in pull requests.'
      ],
      correctAnswer: 0,
      explanation: "Google's Four Golden Signals emphasize Latency (P95/P99), Traffic, Errors, and Saturation as primary health metrics."
    },
    {
      id: `${moduleId}-q6`,
      question: `What is the primary benefit of declarative configuration over imperative scripting in ${moduleTitle}?`,
      options: [
        'Describes desired end state and enables idempotent automated reconciliation.',
        'Allows arbitrary side-effects without state tracking.',
        'Runs significantly faster because it skips kernel checks.',
        'Does not require validation before execution.'
      ],
      correctAnswer: 0,
      explanation: 'Declarative systems continuously reconcile the current state to the declared desired state, ensuring idempotency and predictability.'
    },
    {
      id: `${moduleId}-q7`,
      question: `When scaling ${moduleTitle} horizontally, what constraint is most critical?`,
      options: [
        'Application instances should be stateless, delegating persistence to distributed databases or caches.',
        'All instances must share local memory pointers via DMA.',
        'Traffic must be routed to only one instance at all times.',
        'Nodes must run the same operating system build number.'
      ],
      correctAnswer: 0,
      explanation: 'Statelessness enables frictionless elasticity because any incoming request can be served by any healthy instance.'
    },
    {
      id: `${moduleId}-q8`,
      question: `In code review processes for ${moduleTitle}, what is a core quality gate before merging?`,
      options: [
        'Passing automated linting, unit/integration test suites, and security vulnerability scans.',
        'Approval from the marketing department.',
        'Reducing the test coverage threshold below 40%.',
        'Deleting historical git commit logs.'
      ],
      correctAnswer: 0,
      explanation: 'Automated CI quality gates enforce code style, static analysis, unit tests, and dependency vulnerability scans prior to PR merges.'
    },
    {
      id: `${moduleId}-q9`,
      question: `What caching strategy provides the best balance between read performance and data consistency in ${moduleTitle}?`,
      options: [
        'Cache-aside with explicit Time-To-Live (TTL) expiration and event-driven invalidation.',
        'Infinite caching without eviction policies.',
        'Bypassing caches and reading raw spinning disk sectors directly.',
        'Writing all writes to cache only without database persistence.'
      ],
      correctAnswer: 0,
      explanation: 'Cache-aside with TTL and targeted invalidation ensures high read throughput while preventing stale data accumulation.'
    },
    {
      id: `${moduleId}-q10`,
      question: `What is the main objective of comprehensive logging and tracing in ${moduleTitle}?`,
      options: [
        'Providing end-to-end auditability, fast root cause analysis (RCA), and operational visibility.',
        'Filling up server disks to trigger automated autoscaling alerts.',
        'Exposing database connection strings to end users in HTTP responses.',
        'Replacing software unit tests.'
      ],
      correctAnswer: 0,
      explanation: 'Structured logging and distributed tracing enable engineering teams to diagnose production incidents and perform root-cause analysis swiftly.'
    }
  ];
}
