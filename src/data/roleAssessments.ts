import { AssessmentQuestion } from '../types';

export const ROLE_ASSESSMENT_POOLS: Record<string, AssessmentQuestion[]> = {
  // 1. Full Stack Cloud Engineer
  'Full Stack Cloud Engineer': [
    {
      id: 'fs-1',
      category: 'cloud_devops',
      categoryName: 'Cloud Infrastructure & Microservices',
      question: 'In a cloud microservices architecture, how does the Circuit Breaker pattern (e.g. Resilience4j or Envoy) prevent cascading cascading failures across downstream services?',
      options: [
        'By immediately terminating slow worker nodes and spinning up new EC2 instances',
        'By intercepting failures and fast-failing requests when error thresholds are exceeded, allowing the downstream system to recover',
        'By encrypting inter-service gRPC payloads with asymmetric RSA keys',
        'By buffering all network packets on local disk until CPU drops below 20%'
      ],
      correctAnswer: 1,
      explanation: 'The Circuit Breaker pattern detects failures and trips into an Open state to prevent repeated requests from crushing an already degraded service, returning cached fallbacks or errors immediately.',
      difficulty: 'medium'
    },
    {
      id: 'fs-2',
      category: 'frontend_web',
      categoryName: 'Modern React & Concurrency',
      question: 'How does React 19 / Server Components (RSC) alter the client-side JavaScript bundle size when rendering static component subtrees?',
      options: [
        'It compiles all React code into WebAssembly binaries on the client browser',
        'RSC renders static components exclusively on the server, streaming HTML/JSON and omitting their npm dependencies from the client bundle',
        'It forces every component to execute inside a Web Worker thread',
        'It converts JSX into standard canvas rendering primitives'
      ],
      correctAnswer: 1,
      explanation: 'React Server Components execute only on the server. Their dependencies and rendering logic never get shipped to the client JavaScript bundle, significantly minimizing client hydration overhead.',
      difficulty: 'hard'
    },
    {
      id: 'fs-3',
      category: 'backend_systems',
      categoryName: 'High-Throughput Databases',
      question: 'When designing a relational schema with PostgreSQL for high-write telemetry data, what partitioning strategy prevents sequential table scan degradation as tables exceed tens of millions of rows?',
      options: [
        'Declarative Range Partitioning based on timestamp intervals (e.g. monthly)',
        'Unindexed JSONB columns storing raw blobs',
        'Trigger-based duplication into MongoDB',
        'Single global table with a serial primary key without indices'
      ],
      correctAnswer: 0,
      explanation: 'Declarative Range Partitioning divides large tables into smaller physical tables based on date/time ranges. Postgres query planning prunes unaffected partitions during execution.',
      difficulty: 'medium'
    },
    {
      id: 'fs-4',
      category: 'cloud_devops',
      categoryName: 'Kubernetes Pod Networking',
      question: 'In Kubernetes, what is the role of an Ingress Controller compared to a ClusterIP service?',
      codeSnippet: 'apiVersion: networking.k8s.io/v1\nkind: Ingress\nmetadata:\n  name: spark-ingress\nspec:\n  rules:\n  - host: api.spark.edu',
      options: [
        'Ingress manages external Layer 7 HTTP/HTTPS traffic routing, SSL termination, and virtual hosting, while ClusterIP is internal-only to the cluster',
        'Ingress creates physical fiber-optic connections to the cloud data center',
        'ClusterIP handles public DNS resolution across the internet',
        'Ingress is only used for Docker Swarm clusters'
      ],
      correctAnswer: 0,
      explanation: 'An Ingress controller operates at Layer 7 (Application) providing external access, SSL termination, and path routing to backend internal ClusterIP services.',
      difficulty: 'medium'
    },
    {
      id: 'fs-5',
      category: 'fundamentals',
      categoryName: 'Data Structures & Distributed Caching',
      question: 'Which data structure does Redis utilize internally to implement high-speed Ranked Leaderboards with O(log N) addition and rank lookup?',
      options: [
        'Skip List combined with a Hash Table (Sorted Set / ZSET)',
        'Singly Linked List',
        'Trie (Prefix Tree)',
        'Fixed-size Circular Buffer'
      ],
      correctAnswer: 0,
      explanation: 'Redis Sorted Sets (ZSET) are implemented using a combination of a hash table (for O(1) element lookup) and a Skip List (for O(log N) score insertion and range ordering).',
      difficulty: 'hard'
    },
    {
      id: 'fs-6',
      category: 'cloud_devops',
      categoryName: 'CI/CD & GitOps',
      question: 'In modern GitOps (e.g., using ArgoCD or Flux), what defines the single source of truth for desired cluster state?',
      options: [
        'The manual command history of the cluster administrator',
        'A Git repository containing declarative manifests / Helm charts',
        'The local Docker daemon container cache',
        'A centralized Slack bot channel'
      ],
      correctAnswer: 1,
      explanation: 'GitOps dictates that declarative infrastructure and application definitions reside in version-controlled Git repositories, with automated controllers continuously synchronizing cluster state.',
      difficulty: 'easy'
    },
    {
      id: 'fs-7',
      category: 'backend_systems',
      categoryName: 'Connection Pooling & Saturation',
      question: 'Why is a database connection pooler like PgBouncer essential when running hundreds of concurrent serverless microservice functions (e.g. AWS Lambda) connecting to PostgreSQL?',
      options: [
        'PostgreSQL forks an OS process per client connection; sudden spikes of hundreds of raw TCP connections overwhelm RAM and trigger connection exhaustion',
        'PgBouncer compiles SQL queries into bytecode binaries',
        'Serverless functions cannot execute standard SELECT statements without an external proxy',
        'PostgreSQL requires PgBouncer to calculate floating-point math'
      ],
      correctAnswer: 0,
      explanation: 'PostgreSQL uses a process-per-connection architecture. Excessive raw client connections cause heavy context switching and RAM consumption. PgBouncer multiplexes connections via transaction pooling.',
      difficulty: 'hard'
    },
    {
      id: 'fs-8',
      category: 'frontend_web',
      categoryName: 'WebSockets & Distributed Pub/Sub',
      question: 'When horizontal scaling of Node.js WebSocket servers occurs across multiple containers, how do client instances on server A broadcast real-time messages to connected users on server B?',
      options: [
        'Via a shared distributed Pub/Sub message broker (e.g. Redis Pub/Sub or RabbitMQ cluster)',
        'By saving each socket instance directly into localStorage',
        'By polling DNS records every 10 milliseconds',
        'Through physical USB cables between cloud servers'
      ],
      correctAnswer: 0,
      explanation: 'Because WebSockets maintain stateful TCP sockets tied to specific server processes, cross-server broadcasting requires an external message broker like Redis Pub/Sub to dispatch messages to all cluster instances.',
      difficulty: 'medium'
    },
    {
      id: 'fs-9',
      category: 'cloud_devops',
      categoryName: 'Docker Multi-Stage Optimization',
      question: 'What is the primary advantage of utilizing Multi-Stage Docker builds for production Node.js or Go web applications?',
      codeSnippet: 'FROM node:20-alpine AS builder\nWORKDIR /app\nRUN npm run build\n\nFROM node:20-alpine AS runner\nCOPY --from=builder /app/dist ./dist',
      options: [
        'Separates heavy build toolchains, test suites, and devDependencies from the final minimal production runtime image, drastically reducing container size and attack surface',
        'Allows Docker to run Windows binaries on ARM processors',
        'Automatically signs the image with an SSL certificate',
        'Disables Docker daemon logging'
      ],
      correctAnswer: 0,
      explanation: 'Multi-stage builds leave compiler SDKs and build devDependencies behind in intermediate builder stages, yielding lean, secure production containers containing only compiled artifacts.',
      difficulty: 'medium'
    },
    {
      id: 'fs-10',
      category: 'backend_systems',
      categoryName: 'API Design & Over-fetching',
      question: 'When comparing GraphQL to RESTful APIs for high-throughput mobile clients, which architectural problem does GraphQL fundamentally solve?',
      options: [
        'Over-fetching and under-fetching by allowing the client to request precisely the nested graph attributes required in a single network round-trip',
        'GraphQL eliminates the need for database storage',
        'GraphQL disables HTTP status codes entirely',
        'GraphQL converts all responses into binary audio streams'
      ],
      correctAnswer: 0,
      explanation: 'GraphQL allows client-specified response schemas, eliminating over-fetching (retrieving unneeded columns) and under-fetching (making multiple sequential REST round-trips to assemble relational views).',
      difficulty: 'easy'
    },
    {
      id: 'fs-11',
      category: 'cloud_devops',
      categoryName: 'Cloud Security & IAM Least Privilege',
      question: 'In cloud infrastructure (AWS/GCP/Azure), why is assigning temporary role-based credentials (e.g. AWS STS or Workload Identity) superior to hardcoding static IAM Access Keys in environment variables?',
      options: [
        'Temporary credentials automatically expire within short durations (15m to 1h), rendering leaked keys useless to attackers and eliminating secret rotation maintenance',
        'Static keys encrypt the source code with 512-bit hashes',
        'Cloud providers charge additional licensing fees for static keys',
        'Temporary credentials allow instances to bypass all VPC firewall rules'
      ],
      correctAnswer: 0,
      explanation: 'Short-lived tokens drastically mitigate the risk of credential exfiltration from git commits or memory leaks, conforming to zero-trust security postures.',
      difficulty: 'medium'
    },
    {
      id: 'fs-12',
      category: 'backend_systems',
      categoryName: 'Database Isolation Levels & Concurrency',
      question: 'Under PostgreSQL’s default READ COMMITTED isolation level, what concurrency anomaly is still possible within a transaction block?',
      options: [
        'Non-repeatable reads (a row re-queried during the transaction may return values modified and committed by a concurrent transaction)',
        'Dirty reads (reading uncommitted changes from another transaction)',
        'Physical table corruption on disk',
        'Hardware memory exhaustion'
      ],
      correctAnswer: 0,
      explanation: 'In READ COMMITTED, each SELECT takes a new snapshot. If another transaction commits an update between two reads in the same transaction, values can change (Non-repeatable read). PostgreSQL never permits dirty reads.',
      difficulty: 'hard'
    },
    {
      id: 'fs-13',
      category: 'frontend_web',
      categoryName: 'Rendering Paradigms & Web Architecture',
      question: 'What is the architectural purpose of Streaming SSR (Server-Side Rendering) combined with HTML chunk pipelining in modern frameworks like Next.js or Remix?',
      options: [
        'It streams critical shell UI immediately to the browser so users see visual content while slow database queries continue resolving in parallel on the server',
        'It converts client browsers into cryptocurrency mining nodes',
        'It forces all CSS styles to be rendered as Base64 SVG images',
        'It replaces JavaScript with raw assembly code on the client'
      ],
      correctAnswer: 0,
      explanation: 'Streaming SSR uses Transfer-Encoding: chunked to transmit early layout chunks and React Suspense boundaries as soon as they are ready, dramatically cutting TTFB and FCP.',
      difficulty: 'medium'
    },
    {
      id: 'fs-14',
      category: 'fundamentals',
      categoryName: 'Distributed Consensus & Raft/Paxos',
      question: 'Why do distributed key-value stores (e.g. etcd, ZooKeeper, Consul) require an odd number of cluster nodes (e.g. 3 or 5)?',
      options: [
        'To establish an unambiguous majority quorum ((N/2) + 1) during network partitions, preventing Split-Brain scenarios while tolerating node failures',
        'Odd numbers reduce electricity consumption in data centers',
        'Linux sockets cannot open connections across even-numbered server racks',
        'To prevent duplicate IP addresses on the network'
      ],
      correctAnswer: 0,
      explanation: 'A 3-node cluster tolerates 1 failure (quorum = 2). A 4-node cluster also tolerates only 1 failure (quorum = 3) but requires more consensus messages. Odd nodes optimize fault tolerance per node count.',
      difficulty: 'hard'
    },
    {
      id: 'fs-15',
      category: 'cloud_devops',
      categoryName: 'Zero-Downtime Database Migrations',
      question: 'When performing a schema migration in production that renames a column on a high-throughput table with millions of active users, what is the correct zero-downtime procedure?',
      options: [
        'Expand and Contract pattern: Add new column -> Dual-write in application -> Backfill data -> Switch reads to new column -> Remove dual-write and drop old column',
        'Run `ALTER TABLE users RENAME COLUMN` directly during peak hours',
        'Stop the PostgreSQL server for 2 hours on Sunday night',
        'Drop the table and recreate it from a CSV backup'
      ],
      correctAnswer: 0,
      explanation: 'The Expand and Contract (or Parallel Run) pattern guarantees backwards and forwards compatibility between old and new application versions without locking tables or dropping active traffic.',
      difficulty: 'hard'
    }
  ],

  // 2. AI/ML Specialist
  'AI/ML Specialist': [
    {
      id: 'ai-1',
      category: 'ai_data',
      categoryName: 'Deep Learning & Attention Mechanism',
      question: 'In the Transformer architecture (Vaswani et al.), what is the mathematical formulation of Scaled Dot-Product Attention?',
      codeSnippet: 'Attention(Q, K, V) = softmax(Q * K^T / sqrt(d_k)) * V',
      options: [
        'softmax(Q * K^T / sqrt(d_k)) * V',
        'sigmoid(Q + K + V)',
        'norm(Q * K) / norm(V)',
        'ReLU(Q * K^T) + V'
      ],
      correctAnswer: 0,
      explanation: 'Scaled Dot-Product Attention calculates dot product of queries and keys, scales by sqrt(d_k) to prevent vanishing gradients in softmax, and multiplies by values V.',
      difficulty: 'medium'
    },
    {
      id: 'ai-2',
      category: 'ai_data',
      categoryName: 'Vector Embeddings & RAG',
      question: 'In a Retrieval-Augmented Generation (RAG) pipeline, why is Hierarchical Navigable Small World (HNSW) indexing favored over brute-force flat L2 search for million-scale vector retrieval?',
      options: [
        'HNSW provides sub-linear logarithmic approximate nearest neighbor search time through multi-layer proximity graphs',
        'HNSW encrypts vectors using SHA-256 hashes',
        'HNSW completely eliminates the need for an LLM embedding model',
        'Flat search requires negative dimensional embeddings'
      ],
      correctAnswer: 0,
      explanation: 'HNSW is a graph-based Approximate Nearest Neighbor (ANN) algorithm offering O(log N) query time with high recall, whereas flat index search requires exhaustive O(N) comparisons.',
      difficulty: 'hard'
    },
    {
      id: 'ai-3',
      category: 'ai_data',
      categoryName: 'Model Optimization & Fine-Tuning',
      question: 'What is the core principle of Low-Rank Adaptation (LoRA) for parameter-efficient fine-tuning of Large Language Models?',
      options: [
        'It freezes the pre-trained model weights and injects trainable low-rank decomposition matrices (A and B) into transformer layers',
        'It quantizes all weights to 1-bit binary values and discards half the layers',
        'It retrains the entire foundational model from scratch on consumer CPUs',
        'It converts transformer weights into classical linear regression coefficients'
      ],
      correctAnswer: 0,
      explanation: 'LoRA freezes base weights W0 and represents the update delta as the product of two low-rank matrices B*A where rank r << d, drastically reducing trainable parameters and GPU VRAM.',
      difficulty: 'hard'
    },
    {
      id: 'ai-4',
      category: 'ai_data',
      categoryName: 'Computer Vision & Representation',
      question: 'Why are Residual Connections (Skip Connections) vital in deep convolutional and vision transformer backbones?',
      options: [
        'They allow gradients to propagate directly through the identity mapping, mitigating the vanishing gradient problem during backpropagation',
        'They downscale image resolution to 16x16 pixels automatically',
        'They ensure all convolutional filters use integer arithmetic only',
        'They eliminate the need for training dataset labels'
      ],
      correctAnswer: 0,
      explanation: 'Skip connections allow gradient signals to flow unimpeded directly through the computational graph, enabling stable training of networks with hundreds of layers without gradient vanishing.',
      difficulty: 'medium'
    },
    {
      id: 'ai-5',
      category: 'fundamentals',
      categoryName: 'ML Evaluation & Metrics',
      question: 'In an imbalanced classification problem (e.g. fraud detection where positive class is 0.1%), which metric provides the most honest assessment of model effectiveness compared to Accuracy?',
      options: [
        'Area Under the Precision-Recall Curve (PR-AUC) or F1-Score',
        'Raw Classification Accuracy',
        'Mean Squared Error (MSE)',
        'R-squared Correlation'
      ],
      correctAnswer: 0,
      explanation: 'In heavy class imbalance, a naive model predicting 100% negative achieves 99.9% accuracy. PR-AUC and F1-Score focus specifically on minority class precision and recall dynamics.',
      difficulty: 'easy'
    },
    {
      id: 'ai-6',
      category: 'cloud_devops',
      categoryName: 'MLOps & Inference Serving',
      question: 'Which technique allows LLM serving engines (such as vLLM or TensorRT-LLM) to virtually manage Key-Value (KV) cache memory without dynamic re-allocation fragmentation?',
      options: [
        'PagedAttention (inspired by virtual memory paging in operating systems)',
        'Zero-copy socket polling',
        'Static text compression using Gzip',
        'Hardcoded swap partition writes'
      ],
      correctAnswer: 0,
      explanation: 'PagedAttention partitions the continuous KV cache into physical blocks, mapping non-contiguous memory allocations in virtual tables to near 0% memory waste.',
      difficulty: 'hard'
    },
    {
      id: 'ai-7',
      category: 'ai_data',
      categoryName: 'Model Quantization (QLoRA / GGUF)',
      question: 'In QLoRA (Dettmers et al.), what is the purpose of NormalFloat4 (NF4) data type compared to standard FP4?',
      options: [
        'NF4 is an information-theoretically optimal quantile quantization scheme for normally distributed neural network weights, minimizing quantization error',
        'NF4 doubles the size of weights for faster CPU execution',
        'NF4 replaces float values with ASCII characters',
        'NF4 requires liquid cooling hardware to operate'
      ],
      correctAnswer: 0,
      explanation: 'Pretrained neural network weights typically follow a normal distribution centered at zero. NF4 defines quantile intervals with equal theoretical probability, achieving higher empirical accuracy at 4-bit precision.',
      difficulty: 'hard'
    },
    {
      id: 'ai-8',
      category: 'ai_data',
      categoryName: 'Data Preprocessing & Data Leakage',
      question: 'When training a predictive ML model, why must standard scaling (StandardScaler) or target encoding be fit ONLY on the training split and then transformed on the validation/test split?',
      options: [
        'Fitting scaling parameters across the entire dataset introduces Data Leakage, giving the training process unauthorized statistical knowledge of test distribution variance',
        'Scikit-learn crashes with a segmentation fault if fit() is run on test data',
        'It converts test values into negative numbers',
        'It is merely a stylistic preference with no mathematical consequence'
      ],
      correctAnswer: 0,
      explanation: 'Data leakage happens when information from outside the training set influences the model. Fitting statistics (mean, variance) across all data yields over-optimistic performance estimates that fail in production.',
      difficulty: 'medium'
    },
    {
      id: 'ai-9',
      category: 'ai_data',
      categoryName: 'Positional Encodings in Transformers',
      question: 'Why do modern LLMs (e.g. LLaMA, Mistral, Gemma) replace static Sinusoidal Positional Encodings with Rotary Position Embeddings (RoPE)?',
      options: [
        'RoPE encodes relative token distances by rotating query and key representations in the complex 2D plane, facilitating sequence length extrapolation',
        'RoPE compresses vocabulary size from 32,000 to 1,000 tokens',
        'RoPE converts self-attention into convolution',
        'RoPE eliminates the need for matrix multiplications'
      ],
      correctAnswer: 0,
      explanation: 'RoPE applies an orthogonal rotation matrix to query and key vectors such that their inner product naturally decays with relative token distance, granting robust long-context extrapolation.',
      difficulty: 'hard'
    },
    {
      id: 'ai-10',
      category: 'fundamentals',
      categoryName: 'Overfitting & Regularization',
      question: 'In Deep Neural Networks, what is the mechanistic effect of applying Dropout (e.g., p = 0.3) during forward propagation in training?',
      options: [
        'It randomly zeroes out activations with probability p, preventing co-adaptation of feature detectors and simulating an ensemble of sub-networks',
        'It drops 30% of training dataset rows permanently from disk',
        'It limits GPU power draw by 30%',
        'It rounds all gradients to zero'
      ],
      correctAnswer: 0,
      explanation: 'Dropout forces nodes to learn robust, generalized representations without relying on specific neighboring neurons, effectively acting as an implicit bagging ensemble of thinned networks.',
      difficulty: 'easy'
    },
    {
      id: 'ai-11',
      category: 'ai_data',
      categoryName: 'Parameter-Efficient Fine-Tuning (PEFT / LoRA)',
      question: 'How does Low-Rank Adaptation (LoRA) reduce VRAM requirements by over 70% when fine-tuning billion-parameter LLMs?',
      options: [
        'Freezes the pre-trained weight matrix W and decomposes the update matrix delta_W into two low-rank matrices A and B (delta_W = B x A where rank r << d)',
        'Rounds all floating-point numbers to whole integers',
        'Discards all attention layers and keeps only feed-forward layers',
        'Downloads pre-computed gradients directly from HuggingFace without backpropagation'
      ],
      correctAnswer: 0,
      explanation: 'LoRA assumes weight updates have a low intrinsic dimension. Instead of updating d x d matrices, it trains d x r and r x d matrices (r often 8 or 16), reducing trainable parameters by up to 99%.',
      difficulty: 'hard'
    },
    {
      id: 'ai-12',
      category: 'ai_data',
      categoryName: 'Vector Database Indexing (HNSW)',
      question: 'Why is Hierarchical Navigable Small World (HNSW) graphs the preferred index structure for low-latency vector similarity search in production AI systems?',
      options: [
        'Constructs multi-layer skip-list-style graphs that provide approximate nearest neighbor (ANN) retrieval in O(log N) time with high recall',
        'Sorts high-dimensional embeddings alphabetically',
        'Converts all vectors into 1D scalar integers',
        'Computes exact cosine similarity across all N dataset rows synchronously'
      ],
      correctAnswer: 0,
      explanation: 'HNSW builds a hierarchical graph where top layers have long-range links for coarse navigation and bottom layers contain dense clusters for fine-grained nearest neighbor resolution.',
      difficulty: 'hard'
    },
    {
      id: 'ai-13',
      category: 'ai_data',
      categoryName: 'Model Quantization (GGUF & AWQ)',
      question: 'What is the operational purpose of Activation-aware Weight Quantization (AWQ) when serving Large Language Models on consumer or edge hardware?',
      options: [
        'It protects the top 1% most salient weight channels from quantization error while compressing remaining weights to 4-bit integers, retaining model accuracy with minimal perplexity degradation',
        'It deletes 50% of the layers in the neural network',
        'It speeds up Python script execution by compiling into C++',
        'It translates English prompt tokens into Spanish before inference'
      ],
      correctAnswer: 0,
      explanation: 'AWQ observes that not all weights are equally important. By identifying weights that correlate with large activation magnitudes and scaling them before quantization, it prevents severe accuracy loss.',
      difficulty: 'medium'
    },
    {
      id: 'ai-14',
      category: 'ai_data',
      categoryName: 'Reinforcement Learning from Human Feedback (RLHF / DPO)',
      question: 'Compared to traditional PPO-based RLHF, why has Direct Preference Optimization (DPO) become the industry standard for LLM alignment?',
      options: [
        'DPO mathematically derives a closed-form loss function directly over preference pairs (chosen vs. rejected), eliminating the need for a separate reward model and complex actor-critic reinforcement learning loops',
        'DPO requires human annotators to write raw C code',
        'DPO works only with computer vision models',
        'DPO eliminates the need for prompt tokens'
      ],
      correctAnswer: 0,
      explanation: 'DPO reparameterizes the RL objective to extract the implicit reward function from the language model itself, allowing stable, standard supervised cross-entropy-style training.',
      difficulty: 'hard'
    },
    {
      id: 'ai-15',
      category: 'fundamentals',
      categoryName: 'Evaluation Metrics & Class Imbalance',
      question: 'When evaluating a fraud detection or disease screening model where positive cases represent only 0.1% of all samples, why is ROC-AUC misleading compared to PR-AUC (Precision-Recall AUC)?',
      options: [
        'ROC-AUC includes True Negative Rate in its False Positive Rate denominator; a massive pool of true negatives inflates the score even when false positive predictions vastly outnumber true positives',
        'ROC-AUC cannot be calculated on computers with 64-bit processors',
        'Precision and recall can only be evaluated on text datasets',
        'PR-AUC is always equal to 1.0 on imbalanced data'
      ],
      correctAnswer: 0,
      explanation: 'With heavy class imbalance, huge numbers of True Negatives keep FPR = FP / (FP + TN) deceptively tiny. PR-AUC focuses solely on the minority positive class, providing an honest assessment.',
      difficulty: 'medium'
    }
  ],

  // 3. DevOps & SRE Engineer
  'DevOps & SRE Engineer': [
    {
      id: 'devops-1',
      category: 'cloud_devops',
      categoryName: 'Site Reliability Engineering',
      question: "According to Google's SRE principles, what is an 'Error Budget' and how is it derived?",
      options: [
        'The total monetary budget allocated to cloud servers per quarter',
        'The allowable margin of unreliability defined as 100% minus the Service Level Objective (SLO)',
        'The maximum number of bugs a developer can file before probation',
        'The number of retry packets allowed per TCP handshake'
      ],
      correctAnswer: 1,
      explanation: 'An Error Budget represents 1 minus the SLO (e.g. for a 99.9% availability SLO, the error budget is 0.1% downtime). It governs the trade-off between deployment velocity and system stability.',
      difficulty: 'medium'
    },
    {
      id: 'devops-2',
      category: 'cloud_devops',
      categoryName: 'Infrastructure as Code (IaC)',
      question: 'In Terraform / OpenTofu, what is the primary risk of not locking the remote state file (e.g. via DynamoDB with S3 backend)?',
      options: [
        'Concurrent applies can overwrite and corrupt state file metadata leading to duplicate or orphaned cloud resources',
        'Terraform automatically deletes all local .tf configuration files',
        'The AWS billing console locks account access for 48 hours',
        'It converts HCL syntax into YAML automatically'
      ],
      correctAnswer: 0,
      explanation: 'State locking prevents multiple engineers or CI/CD pipelines from simultaneously executing terraform apply, ensuring serial transactional mutations against the state file.',
      difficulty: 'medium'
    },
    {
      id: 'devops-3',
      category: 'cloud_devops',
      categoryName: 'Container Orchestration & Pod Lifecycle',
      question: "What is the difference between a Kubernetes 'Liveness Probe' and a 'Readiness Probe'?",
      options: [
        'Liveness probe determines if the pod should be killed and restarted; Readiness probe determines if the pod can receive ingress traffic',
        'Liveness probe checks CPU temperature; Readiness probe monitors memory leaks',
        'Readiness probe is only for database pods; Liveness probe is for web pods',
        'Both probes perform the identical function with different log prefixes'
      ],
      correctAnswer: 0,
      explanation: 'If a Liveness probe fails, Kubelet kills the container and initiates restart. If a Readiness probe fails, the pod is temporarily removed from service endpoints so traffic bypasses it.',
      difficulty: 'easy'
    },
    {
      id: 'devops-4',
      category: 'cloud_devops',
      categoryName: 'Observability & Metrics',
      question: 'In Prometheus monitoring, what metric type should be utilized to measure API response latency distribution across percentiles (p50, p95, p99)?',
      options: [
        'Histogram or Summary',
        'Counter',
        'Gauge',
        'Untyped String'
      ],
      correctAnswer: 0,
      explanation: 'Prometheus Histograms count observations in configurable bucket thresholds, allowing calculation of quantiles (p95, p99) via the histogram_quantile() PromQL function.',
      difficulty: 'medium'
    },
    {
      id: 'devops-5',
      category: 'cloud_devops',
      categoryName: 'Zero-Downtime Deployments',
      question: 'In a Blue-Green deployment architecture, how is traffic instantly transitioned to the new production version?',
      options: [
        'By updating the router, DNS, or load balancer target group to direct traffic from the Blue cluster to the Green cluster',
        'By rebooting all worker nodes simultaneously',
        'By overwriting the existing containers in-place on the running machines',
        'By pausing the database for 30 minutes'
      ],
      correctAnswer: 0,
      explanation: 'Blue-Green maintains two identical production environments. Once Green is fully validated, traffic is instantaneously switched at the load balancer level with near zero downtime.',
      difficulty: 'easy'
    },
    {
      id: 'devops-6',
      category: 'backend_systems',
      categoryName: 'Linux Kernel & System Performance',
      question: 'What does an elevated Linux system Load Average (e.g. 16.0 on an 8-core CPU) indicate?',
      options: [
        'Processes in R (running) or D (uninterruptible disk sleep) state exceed the available hardware CPU thread capacity',
        'System disk storage is over 95% full',
        'Network cables are unplugged from the NIC',
        'RAM is executing memory refresh cycles'
      ],
      correctAnswer: 0,
      explanation: 'Linux load average measures the average number of threads in the run queue (waiting for CPU) plus processes waiting for disk I/O (uninterruptible sleep state) over 1, 5, and 15 minutes.',
      difficulty: 'hard'
    },
    {
      id: 'devops-7',
      category: 'cloud_devops',
      categoryName: 'Kernel Observability & eBPF',
      question: 'Why has extended Berkeley Packet Filter (eBPF) emerged as a transformative technology in Kubernetes cloud-native networking and security (e.g. Cilium)?',
      options: [
        'It executes sandboxed bytecode safely inside the Linux kernel without modifying kernel source code or loading kernel modules, providing ultra-low overhead packet inspection',
        'It converts all Linux commands into Python scripts',
        'It disables iptables firewall rules completely without replacement',
        'It stores network logs directly on SSD flash memory chips'
      ],
      correctAnswer: 0,
      explanation: 'eBPF allows developers to run verified programs directly in the kernel space upon network socket or system call events, eliminating costly context switches between user and kernel space.',
      difficulty: 'hard'
    },
    {
      id: 'devops-8',
      category: 'cloud_devops',
      categoryName: 'Configuration Management & Idempotency',
      question: 'In Ansible configuration automation, what does the property of "Idempotency" guarantee when a playbook is executed repeatedly against target servers?',
      options: [
        'Applying the playbook multiple times results in the identical system state as executing it once, without unintended mutations or duplicate actions',
        'The playbook will run twice as fast on each successive run',
        'It encrypts all SSH private keys using RSA 4096-bit keys',
        'It reboots the server after every single task'
      ],
      correctAnswer: 0,
      explanation: 'Idempotency ensures that an operation only applies changes if the system is not already in the declared target state, preventing accidental duplication or state drift upon repeated runs.',
      difficulty: 'medium'
    },
    {
      id: 'devops-9',
      category: 'cloud_devops',
      categoryName: 'Network Protocols & TLS 1.3',
      question: 'What major latency improvement was introduced in the TLS 1.3 cryptographic handshake compared to TLS 1.2?',
      options: [
        'Handshake round-trip time (RTT) was reduced from 2-RTT to 1-RTT (and 0-RTT for resumed connections)',
        'TLS 1.3 completely removed the need for asymmetric public key pairs',
        'It converts TCP into UDP unconditionally',
        'It requires hardware USB security tokens for all HTTP clients'
      ],
      correctAnswer: 0,
      explanation: 'TLS 1.3 combines key exchange and cipher negotiation into the initial ClientHello / ServerHello exchange, shaving off an entire network round-trip time (1-RTT).',
      difficulty: 'medium'
    },
    {
      id: 'devops-10',
      category: 'cloud_devops',
      categoryName: 'Chaos Engineering & Resilience',
      question: 'In modern Cloud-Native reliability practices (e.g., using Chaos Mesh or LitmusChaos), what is the objective of running automated Chaos Experiments in staging/canary clusters?',
      options: [
        'Proactively validate whether the distributed system degrades gracefully and self-heals under injected network partitions, pod kills, and disk latency',
        'To erase all production databases during business hours to test tape backups',
        'To benchmark maximum thermal limits of cloud server fans',
        'To generate random password strings for Kubernetes secrets'
      ],
      correctAnswer: 0,
      explanation: 'Chaos engineering purposefully injects simulated failures into a controlled blast radius to uncover unknown architectural vulnerabilities before they cause customer-facing outages.',
      difficulty: 'easy'
    },
    {
      id: 'devops-11',
      category: 'cloud_devops',
      categoryName: 'Kubernetes Custom Resource Definitions (CRDs) & Operators',
      question: 'What constitutes the core architectural pattern of a Kubernetes Operator?',
      options: [
        'A custom controller running a reconciliation loop that continuously watches custom resources (CRDs) and takes convergent actions to align actual cluster state with desired state',
        'A human operator sitting in a 24/7 network operations center typing kubectl commands',
        'A bash script running via cron job that deletes unattached PVCs',
        'A load balancer module that monitors HTTP status codes'
      ],
      correctAnswer: 0,
      explanation: 'The Operator pattern encodes domain-specific operational human knowledge into software by pairing Custom Resource Definitions (CRDs) with an automated control loop reconciling state.',
      difficulty: 'hard'
    },
    {
      id: 'devops-12',
      category: 'cloud_devops',
      categoryName: 'Infrastructure as Code (Terraform State & Locking)',
      question: 'In multi-engineer teams using Terraform, why is a Remote Backend with State Locking (e.g. S3 + DynamoDB or Terraform Cloud) mandatory?',
      options: [
        'Prevents concurrent execution runs from corrupting the terraform.tfstate file by acquiring an atomic mutual-exclusion lock prior to any state mutation',
        'Compiles HCL code into Java JAR files',
        'Allows Terraform to run without an internet connection',
        'Automatically creates mock cloud resources without billing'
      ],
      correctAnswer: 0,
      explanation: 'State locking prevents two engineers or CI/CD pipelines from simultaneously executing `terraform apply`, which would otherwise create race conditions and catastrophic state file desynchronization.',
      difficulty: 'medium'
    },
    {
      id: 'devops-13',
      category: 'cloud_devops',
      categoryName: 'Container Networking Interface (CNI)',
      question: 'In Kubernetes networking, how does an overlay network CNI plugin (e.g. Flannel VXLAN or Calico) route traffic between Pods residing on different physical worker nodes?',
      options: [
        'Encapsulates inner Layer 2/3 pod packets inside outer Layer 4 UDP datagrams transported across the underlying host network and decapsulated at the destination node',
        'Rewires the physical ethernet cables inside the datacenter switches dynamically',
        'Transfers packets as Base64 text messages via standard HTTP POST requests',
        'Broadcasts every single packet to every computer connected to the office Wi-Fi'
      ],
      correctAnswer: 0,
      explanation: 'Overlay networks like VXLAN wrap pod-to-pod network frames within standard UDP packets on the host network, creating a virtual flat cluster network without requiring host network reconfiguration.',
      difficulty: 'hard'
    },
    {
      id: 'devops-14',
      category: 'cloud_devops',
      categoryName: 'Service Mesh & Mutual TLS (mTLS)',
      question: 'What security benefit does a Service Mesh (e.g. Istio or Linkerd) deliver to inter-service communication without requiring any changes to application business logic?',
      options: [
        'Injects sidecar proxies that automatically upgrade all intra-cluster pod traffic to mutually authenticated and encrypted TLS (mTLS) with cryptographic identity certificates',
        'Encrypts hard drives using BitLocker hardware keys',
        'Disables all outgoing HTTP requests permanently',
        'Converts REST endpoints into SQL stored procedures'
      ],
      correctAnswer: 0,
      explanation: 'Sidecar proxies intercept pod egress/ingress traffic transparently, enforcing zero-trust SPIFFE/SPIRE cryptographic identities and mTLS encryption without code modification.',
      difficulty: 'medium'
    },
    {
      id: 'devops-15',
      category: 'backend_systems',
      categoryName: 'Distributed Tracing & Context Propagation',
      question: 'In microservice distributed tracing, what standard HTTP header format is prescribed by the W3C Trace Context recommendation to propagate trace IDs across HTTP boundaries?',
      options: [
        '`traceparent` (containing version, trace-id, parent-id, and trace-flags) and `tracestate`',
        '`Authorization: Bearer <token>`',
        '`X-Forwarded-For: 127.0.0.1`',
        '`Content-Type: application/json`'
      ],
      correctAnswer: 0,
      explanation: 'W3C Trace Context standardizes `traceparent` (e.g., `00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01`) to enable universal distributed context propagation across diverse monitoring vendors.',
      difficulty: 'medium'
    }
  ],

  // 4. Data Engineer & Analytics Specialist
  'Data Engineer & Analytics Specialist': [
    {
      id: 'de-1',
      category: 'backend_systems',
      categoryName: 'Data Lakes & Formats',
      question: 'Why do modern columnar storage formats like Apache Parquet and ORC vastly outperform row-oriented CSV/JSON in analytical OLAP queries?',
      options: [
        'Parquet compresses homogeneous column types with dictionary encoding and enables projection pruning (reading only queried columns)',
        'Parquet converts text into uncompressed base64 strings',
        'CSV files cannot be stored on cloud object storage',
        'Parquet forces all queries to execute using GPU CUDA cores'
      ],
      correctAnswer: 0,
      explanation: 'Columnar storage stores values of the same type contiguously. Queries requesting 2 columns out of 50 only read that 4% of physical data from disk, exploiting dictionary encoding and min/max stats.',
      difficulty: 'medium'
    },
    {
      id: 'de-2',
      category: 'backend_systems',
      categoryName: 'Distributed Stream Processing',
      question: 'In Apache Kafka, what governs message ordering and consumer horizontal scaling across a consumer group?',
      options: [
        'Topic Partitions: messages with the same partition key are strictly ordered, and each partition is consumed by at most one consumer in a group',
        'The timestamp of the client browser',
        'Total number of Kafka broker SSD hard drives',
        'Random shuffle across all network interfaces'
      ],
      correctAnswer: 0,
      explanation: 'Kafka guarantees total ordering within a single partition. Partitions are the unit of parallelism: you can only scale active consumer threads up to the number of partitions.',
      difficulty: 'medium'
    },
    {
      id: 'de-3',
      category: 'backend_systems',
      categoryName: 'Data Warehousing & Modeling',
      question: 'In Kimball Dimensional Modeling, what differentiates a Fact Table from a Dimension Table in a Star Schema?',
      options: [
        'Fact tables store numerical business metrics/measurements with foreign keys; Dimension tables store descriptive contextual attributes',
        'Fact tables store images; Dimension tables store CSS files',
        'Dimension tables can only have 10 rows maximum',
        'Fact tables must always be unindexed flat files'
      ],
      correctAnswer: 0,
      explanation: 'Fact tables contain quantitative metrics (e.g. sales amount, duration) and foreign keys referencing surrounding Dimension tables (customer, date, store) that provide filtering context.',
      difficulty: 'easy'
    },
    {
      id: 'de-4',
      category: 'ai_data',
      categoryName: 'Apache Spark Architecture',
      question: 'In Apache Spark, what causes a wide transformation (such as groupByKey or join) to induce high network shuffle overhead?',
      options: [
        'Data records from multiple partitions across cluster nodes must be redistributed across the network to group identical keys onto the same executor',
        'Spark disables TCP compression on Ethernet ports',
        'Executors must reboot their JVM garbage collector',
        'The Spark driver uploads data to AWS S3 before reading it back'
      ],
      correctAnswer: 0,
      explanation: 'Wide dependencies require a shuffle where Spark writes data to intermediate files and streams records across executor network interfaces so that all rows for a given key land on the same node.',
      difficulty: 'hard'
    },
    {
      id: 'de-5',
      category: 'backend_systems',
      categoryName: 'ACID Lakehouse Architecture',
      question: 'How do modern table formats (Delta Lake, Apache Iceberg, Apache Hudi) achieve ACID transactions over raw object storage (S3/GCS)?',
      options: [
        'Using an immutable commit log (metadata transaction log) with optimistic concurrency control',
        'By placing hardware lock devices on cloud disks',
        'By migrating all data into SQLite memory files',
        'By disallowing simultaneous writes across the company'
      ],
      correctAnswer: 0,
      explanation: 'Iceberg and Delta use atomic commit metadata logs. Writers write new data files and attempt an atomic pointer update in the commit log using optimistic concurrency control (OCC).',
      difficulty: 'hard'
    },
    {
      id: 'de-6',
      category: 'backend_systems',
      categoryName: 'Query Optimization & Indexing',
      question: 'In analytical databases (like BigQuery or Snowflake), what is the primary query cost and performance advantage of Data Clustering and Partitioning?',
      options: [
        'Partition pruning and cluster block skipping drastically reduce bytes scanned, lowering costs and latency',
        'It converts SQL queries into C++ assembly language',
        'It eliminates the need for primary keys',
        'It encrypts datasets with multi-signature wallets'
      ],
      correctAnswer: 0,
      explanation: 'Analytical databases charge based on data scanned. Partitioning by date and clustering by key allows the query engine to completely bypass irrelevant storage micro-partitions.',
      difficulty: 'medium'
    },
    {
      id: 'de-7',
      category: 'backend_systems',
      categoryName: 'Change Data Capture (CDC)',
      question: 'In modern streaming data architectures, how does Log-based Change Data Capture (e.g. Debezium using PostgreSQL WAL or MySQL binlog) compare to query-based polling?',
      options: [
        'Log-based CDC captures every INSERT, UPDATE, and DELETE event in real-time from the database write-ahead log without imposing query scan overhead or missing intermediate state transitions',
        'Log-based CDC requires full table locks during replication',
        'Query-based polling is 100x faster and requires zero CPU',
        'CDC only replicates data once a month'
      ],
      correctAnswer: 0,
      explanation: 'Log-based CDC reads the internal database transaction log directly. It captures delete operations and intermediate updates with minimal production database CPU overhead compared to continuous SELECT polling.',
      difficulty: 'hard'
    },
    {
      id: 'de-8',
      category: 'backend_systems',
      categoryName: 'Data Modeling & SCD',
      question: 'In data warehouse dimensional modeling, what is the design characteristic of a Slowly Changing Dimension Type 2 (SCD Type 2)?',
      options: [
        'It tracks historical changes by inserting a new record with effective start/end timestamps and an active flag whenever an attribute changes',
        'It overwrites the old value in-place without retaining historical audit trails',
        'It creates a new database table every time a customer updates their address',
        'It deletes all historical orders associated with the customer'
      ],
      correctAnswer: 0,
      explanation: 'SCD Type 2 retains full history by creating a new version of the row with start_date, end_date, and is_current fields, enabling accurate point-in-time reporting.',
      difficulty: 'medium'
    },
    {
      id: 'de-9',
      category: 'cloud_devops',
      categoryName: 'Workflow Orchestration & DAGs',
      question: 'In Apache Airflow, what does the concept of "Backfilling" achieve when deploying a revised ETL DAG pipeline?',
      options: [
        'Executes historical DAG runs across past calendar intervals to populate historical data partitions using the new logic',
        'Restores PostgreSQL from a tape backup archive',
        'Reboots the Airflow worker nodes when memory exceeds 80%',
        'Deletes obsolete customer rows permanently'
      ],
      correctAnswer: 0,
      explanation: 'Backfilling executes pipeline DAG runs for past historical schedule intervals, ensuring newly introduced metrics or corrected transformation logic apply retroactively across historical partitions.',
      difficulty: 'medium'
    },
    {
      id: 'de-10',
      category: 'backend_systems',
      categoryName: 'Modern Transformation (dbt)',
      question: 'In dbt (data build tool), what is the difference between an ephemeral materialization and a table/incremental materialization?',
      options: [
        'Ephemeral models are not created directly as physical objects in the warehouse; they are interpolated as Common Table Expressions (CTEs) into downstream models',
        'Ephemeral models are stored permanently in local CSV files',
        'Table materialization deletes the warehouse cluster after every run',
        'Incremental models rebuild the entire 10-year dataset on every run'
      ],
      correctAnswer: 0,
      explanation: 'Ephemeral models exist only in code as reusable modular SQL snippets, injected directly as subqueries/CTEs into dependent models without creating physical database views or tables.',
      difficulty: 'easy'
    },
    {
      id: 'de-11',
      category: 'backend_systems',
      categoryName: 'Lakehouse Table Formats (Apache Iceberg & Delta Lake)',
      question: 'What core feature do open table formats like Apache Iceberg provide on top of raw cloud object storage (S3/GCS)?',
      options: [
        'ACID transactions, snapshot isolation, time-travel queries, and schema evolution via file-level metadata trees without rewriting underlying Parquet files',
        'Automatic translation of SQL queries into JavaScript',
        'Elimination of network transfer latency across continents',
        'Converting all data rows into MP4 video files'
      ],
      correctAnswer: 0,
      explanation: 'Iceberg tracks table state through metadata files rather than directory listings, enabling true atomic commits, concurrent writes, and historical time travel over object storage.',
      difficulty: 'hard'
    },
    {
      id: 'de-12',
      category: 'ai_data',
      categoryName: 'Stream Processing & Watermarks (Apache Flink / Spark)',
      question: 'In stream processing systems like Apache Flink, what is the purpose of a "Watermark" when computing sliding event-time window aggregations?',
      options: [
        'A temporal signal asserting that no further events with event-timestamp prior to the watermark will arrive, allowing the engine to fire and close the window',
        'A visual logo stamped on data charts',
        'A memory leak indicator in the JVM heap',
        'An encryption key for Kafka topics'
      ],
      correctAnswer: 0,
      explanation: 'Watermarks balance latency and completeness in out-of-order event streams by establishing a threshold beyond which late-arriving records are considered expired or dropped.',
      difficulty: 'hard'
    },
    {
      id: 'de-13',
      category: 'backend_systems',
      categoryName: 'Kafka Partitioning & Consumer Groups',
      question: 'In Apache Kafka, if a topic has 6 partitions and a consumer group has 8 active consumer instances, how are the partitions assigned?',
      options: [
        '6 consumers will each be assigned 1 partition, while the remaining 2 consumers will remain idle as hot standbys',
        'All 8 consumers read from all 6 partitions simultaneously, duplicating records',
        'The Kafka cluster throws an OutOfMemory error',
        'Kafka dynamically splits the topic into 48 sub-partitions'
      ],
      correctAnswer: 0,
      explanation: 'In a single consumer group, each partition can be consumed by at most one consumer instance at any given time. Consumer instances exceeding the partition count remain idle.',
      difficulty: 'medium'
    },
    {
      id: 'de-14',
      category: 'backend_systems',
      categoryName: 'Distributed Join Strategies (Broadcast vs Shuffle)',
      question: 'In Apache Spark SQL, when joining a massive 10-billion-row fact table with a 500-row dimension lookup table, which join strategy avoids costly network shuffling?',
      options: [
        'Broadcast Hash Join (Map-Side Join), copying the small dimension table to all worker executor nodes',
        'Shuffle Sort Merge Join',
        'Cartesian Cross Product Join',
        'Nested Loop Join reading from local disk sequentially'
      ],
      correctAnswer: 0,
      explanation: 'Broadcast Hash Join broadcasts the small table to memory across all cluster executors, eliminating the expensive network exchange (shuffle) of the multi-billion-row fact dataset.',
      difficulty: 'medium'
    },
    {
      id: 'de-15',
      category: 'fundamentals',
      categoryName: 'Data Governance & Data Quality (Great Expectations)',
      question: 'What is the function of automated Data Quality Assertion frameworks (e.g. Great Expectations or Soda Core) in production pipelines?',
      options: [
        'Declaratively validates schema constraints, null thresholds, uniqueness, and value distributions at pipeline ingestion boundaries to prevent bad data from polluting downstream dashboards',
        'Replaces Python with automated Excel spreadsheets',
        'Calculates sales tax automatically for e-commerce checkouts',
        'Disables user logins when database CPU exceeds 50%'
      ],
      correctAnswer: 0,
      explanation: 'Data quality assertion tools stop silent data corruption by testing pipeline contracts at ingestion checkpoints before malformed data reaches analytical models and BI dashboards.',
      difficulty: 'easy'
    }
  ],

  // 5. Cybersecurity Analyst
  'Cybersecurity Analyst': [
    {
      id: 'sec-1',
      category: 'backend_systems',
      categoryName: 'Application Security (OWASP)',
      question: 'According to OWASP Top 10, how does utilizing Parameterized Prepared Statements effectively eliminate SQL Injection vulnerabilities?',
      options: [
        'It separates SQL code compilation from untrusted user data inputs, treating all input variables as literal values rather than executable SQL syntax',
        'It converts SQL into Markdown syntax before sending to the server',
        'It limits user input length to exactly 16 characters',
        'It forces all database users to connect with root permissions'
      ],
      correctAnswer: 0,
      explanation: 'Prepared statements pre-compile the SQL template on the database server. When parameter values are bound, the database engine treats them strictly as data, neutralizing syntactic injection.',
      difficulty: 'easy'
    },
    {
      id: 'sec-2',
      category: 'backend_systems',
      categoryName: 'Authentication & Tokens',
      question: 'Why should JSON Web Tokens (JWT) for user sessions be stored in HTTP-Only, Secure, SameSite=Strict cookies rather than localStorage?',
      options: [
        'localStorage is vulnerable to Cross-Site Scripting (XSS) exfiltration, whereas HTTP-Only cookies cannot be read by JavaScript',
        'Cookies can hold 50 megabytes of user profile data',
        'localStorage is purged whenever the computer restarts',
        'HTTP-Only cookies disable SSL certificates'
      ],
      correctAnswer: 0,
      explanation: 'If an attacker executes malicious JS (XSS), localStorage is completely accessible. HTTP-Only cookies are shielded from browser script access, mitigating session token theft.',
      difficulty: 'medium'
    },
    {
      id: 'sec-3',
      category: 'cloud_devops',
      categoryName: 'Network Security & Architecture',
      question: 'What is the core tenet of the Zero Trust Architecture (ZTA) model defined by NIST SP 800-207?',
      options: [
        'Never trust, always verify: perimeter location (internal corporate network) confers no implicit trust; every request must be authenticated and authorized',
        'Disable all passwords and rely solely on IP address whitelists',
        'Trust all devices that connect over company Wi-Fi without VPN',
        'Disconnect all servers from external internet backbones'
      ],
      correctAnswer: 0,
      explanation: 'Zero Trust eliminates the concept of a trusted internal corporate perimeter. Every transaction, user, and device must be explicitly validated, authenticated, and granted least-privilege.',
      difficulty: 'easy'
    },
    {
      id: 'sec-4',
      category: 'backend_systems',
      categoryName: 'Cryptography & Hashing',
      question: 'Why is standard SHA-256 or MD5 unsuited for password storage, and why must slow adaptive algorithms like Argon2id or bcrypt with high work factors be used instead?',
      options: [
        'SHA-256 is designed to be extremely fast on GPUs/ASICs, enabling billions of brute-force password guesses per second; bcrypt/Argon2 enforce configurable memory and computational hardness',
        'SHA-256 cannot hash strings longer than 10 characters',
        'bcrypt generates reversible plain text passwords upon admin request',
        'Argon2 is copyrighted proprietary software requiring annual licenses'
      ],
      correctAnswer: 0,
      explanation: 'Fast cryptographic hashes like SHA-256 enable attackers with consumer GPUs to test billions of candidate hashes per second. Adaptive hashes like Argon2id intentionally consume memory and CPU.',
      difficulty: 'medium'
    },
    {
      id: 'sec-5',
      category: 'cloud_devops',
      categoryName: 'Cloud Security & IAM',
      question: "What does the Principle of Least Privilege (PoLP) dictate in Cloud IAM policies?",
      options: [
        'Users and service accounts should be granted only the minimum permissions necessary to perform their legitimate tasks, and nothing more',
        'Every developer should be granted AdministratorAccess during testing',
        'Root account access keys should be stored in public GitHub repositories',
        'Permissions should be assigned alphabetically based on user last name'
      ],
      correctAnswer: 0,
      explanation: 'Least privilege ensures that compromised credentials or insider errors inflict minimal blast radius by restricting access to the absolute minimum set of resource actions required.',
      difficulty: 'easy'
    },
    {
      id: 'sec-6',
      category: 'backend_systems',
      categoryName: 'Security Operations & Incident Response',
      question: 'What is the objective of a Security Information and Event Management (SIEM) platform (e.g. Splunk or Elastic Security) in a SOC?',
      options: [
        'Aggregate, correlate, and analyze log telemetry across servers, firewalls, and applications in real-time to detect anomalous intrusion patterns',
        'Automatically compile C++ code on developer laptops',
        'Issue credit cards to corporate employees',
        'Replace all cloud firewall hardware with software routers'
      ],
      correctAnswer: 0,
      explanation: 'SIEM software aggregates security event data and logs from disparate network and cloud endpoints, correlating events to alert SOC analysts of unauthorized activity.',
      difficulty: 'medium'
    },
    {
      id: 'sec-7',
      category: 'backend_systems',
      categoryName: 'Cross-Site Request Forgery (CSRF)',
      question: 'How does the Synchronizer Token Pattern defend web applications against Cross-Site Request Forgery (CSRF) attacks?',
      options: [
        'Generates a cryptographically random, unpredictable token per user session that must be submitted in state-mutating request headers or form bodies, which third-party attacker origins cannot read due to SOP',
        'It encrypts the entire web server disk with BitLocker',
        'It disallows users from using mobile browsers',
        'It requires entering an SMS OTP for every single GET request'
      ],
      correctAnswer: 0,
      explanation: 'CSRF exploits authenticated browser sessions. Because Same-Origin Policy (SOP) prevents malicious external websites from reading anti-CSRF tokens embedded in the legitimate app, forged requests lack the valid token.',
      difficulty: 'medium'
    },
    {
      id: 'sec-8',
      category: 'fundamentals',
      categoryName: 'Threat Modeling & MITRE ATT&CK',
      question: 'In cybersecurity operations, what is the MITRE ATT&CK framework used for?',
      options: [
        'A comprehensive globally-accessible knowledge base of adversary tactics, techniques, and procedures (TTPs) based on real-world threat observations',
        'A proprietary antivirus software package for macOS',
        'A standard for designing physical firewall hardware racks',
        'A replacement programming language for C++'
      ],
      correctAnswer: 0,
      explanation: 'MITRE ATT&CK structures cyber attack lifecycles into tactics (objectives) and techniques (methods), enabling security teams to model threats and test defensive coverage systematically.',
      difficulty: 'easy'
    },
    {
      id: 'sec-9',
      category: 'cloud_devops',
      categoryName: 'Public Key Infrastructure (PKI)',
      question: 'In asymmetric TLS cryptography, what role does the Certificate Authority (CA) signature play during client trust verification?',
      options: [
        'Attests that the public key belonging to the domain was cryptographically signed by a trusted root authority whose cert is embedded in the client root trust store',
        'Encrypts database passwords in plaintext',
        'Grants the CA full remote desktop access to the web server',
        'Speed up DNS resolution by 50%'
      ],
      correctAnswer: 0,
      explanation: 'A CA signature cryptographically binds an identity (domain name) to a public key. Browsers verify the digital signature against pre-installed trusted root certificates to prevent man-in-the-middle spoofing.',
      difficulty: 'medium'
    },
    {
      id: 'sec-10',
      category: 'backend_systems',
      categoryName: 'Binary Exploitation & Memory Protections',
      question: 'How does Address Space Layout Randomization (ASLR) prevent predictable buffer overflow code execution attacks?',
      options: [
        'Randomizes the memory locations of key program data areas (stack, heap, shared libraries) in virtual address space on every program invocation, rendering hardcoded payload return addresses invalid',
        'Deletes all pointers from compiled C programs',
        'Forces the CPU to execute instructions in reverse',
        'Disables all dynamic RAM allocations'
      ],
      correctAnswer: 0,
      explanation: 'ASLR randomizes virtual memory mapping offsets on each execution. Attackers attempting return-to-libc or shellcode injection cannot reliably predict target memory addresses, causing crashes instead of control hijacking.',
      difficulty: 'hard'
    },
    {
      id: 'sec-11',
      category: 'cloud_devops',
      categoryName: 'Cloud Workload Protection & Container Breakout',
      question: 'In Kubernetes pod security, what is the consequence of deploying a container with `privileged: true` and hostPID namespace sharing?',
      options: [
        'Grants the containerized process near-total root privileges on the host node, allowing malicious actors to access the host /proc filesystem, inspect host processes, and execute container escape',
        'Improves network latency by 10ms',
        'Automatically signs all HTTPS certificates',
        'Prevents memory leaks in Node.js'
      ],
      correctAnswer: 0,
      explanation: 'Privileged containers bypass Linux cgroup and namespace isolation. Sharing hostPID lets container processes see and manipulate host kernel tasks, leading to trivial node compromise.',
      difficulty: 'hard'
    },
    {
      id: 'sec-12',
      category: 'backend_systems',
      categoryName: 'Cryptographic Protocols & Zero Knowledge',
      question: 'What is the fundamental security property guaranteed by Perfect Forward Secrecy (PFS) in TLS key exchange algorithms like ECDHE?',
      options: [
        'Compromise of the server’s long-term private key in the future does not enable retroactive decryption of past recorded session traffic, because session keys are ephemeral and discarded',
        'The server can never crash under high load',
        'Passwords are never sent across the network',
        'All client requests are completely anonymous'
      ],
      correctAnswer: 0,
      explanation: 'PFS generates unique ephemeral key pairs for every TLS session using Diffie-Hellman (ECDHE). Since session keys are never stored on disk, capturing future private keys cannot decrypt past recordings.',
      difficulty: 'hard'
    },
    {
      id: 'sec-13',
      category: 'backend_systems',
      categoryName: 'Authentication Protocols (OAuth 2.0 & PKCE)',
      question: 'Why does RFC 7636 mandate Proof Key for Code Exchange (PKCE) for Single Page Applications (SPAs) and mobile apps implementing OAuth 2.0 authorization code flow?',
      options: [
        'Public clients cannot safely store a client_secret on user devices; PKCE dynamically generates a code_verifier and code_challenge to prevent authorization code interception attacks',
        'PKCE compresses JSON tokens into gzip format',
        'PKCE encrypts client hard drives',
        'PKCE replaces TLS with blockchain cryptography'
      ],
      correctAnswer: 0,
      explanation: 'Public clients (React SPAs, iOS/Android apps) cannot keep client secrets confidential. PKCE binds the authorization code request to the token redemption using dynamically computed SHA-256 challenges.',
      difficulty: 'medium'
    },
    {
      id: 'sec-14',
      category: 'cloud_devops',
      categoryName: 'Software Supply Chain Security (SLSA & SBOM)',
      question: 'In modern DevSecOps, what is a Software Bill of Materials (SBOM) and how does it accelerate incident response during zero-day vulnerabilities (e.g. Log4Shell)?',
      options: [
        'A formal machine-readable inventory (e.g. SPDX or CycloneDX) detailing every nested open-source component, version, and dependency in a software artifact, enabling instant identification of vulnerable libraries',
        'A bill sent to enterprise finance teams for cloud computing credits',
        'A legal disclaimer printed on physical software boxes',
        'A list of developer GitHub usernames and passwords'
      ],
      correctAnswer: 0,
      explanation: 'An SBOM allows security operations to query their entire application fleet to instantly pinpoint whether a newly disclosed CVE exists in their deployed dependency graphs without recompiling code.',
      difficulty: 'easy'
    },
    {
      id: 'sec-15',
      category: 'fundamentals',
      categoryName: 'Cross-Site Scripting (XSS) & Content Security Policy',
      question: 'How does a strict Content Security Policy (CSP) header like `script-src \'self\' \'nonce-xyz\';` mitigate stored Cross-Site Scripting (XSS) attacks?',
      options: [
        'Instructs the browser to execute only JavaScript from the same origin or containing the server-generated cryptographic nonce, preventing injected inline `<script>` tags from executing',
        'Deletes all cookies whenever the user navigates away',
        'Converts HTML tags into encrypted Base64 images',
        'Blocks all CSS stylesheet downloads'
      ],
      correctAnswer: 0,
      explanation: 'CSP nonces require valid scripts to possess a random cryptographic token generated per HTTP response. Malicious injected scripts lack this secret nonce and are blocked by the browser engine.',
      difficulty: 'medium'
    }
  ],

  // 6. Embedded & IoT Systems Engineer
  'Embedded & IoT Systems Engineer': [
    {
      id: 'emb-1',
      category: 'backend_systems',
      categoryName: 'Microcontroller Protocols',
      question: 'What are the characteristic pin requirements and transmission properties of the I2C serial communication protocol compared to SPI?',
      options: [
        'I2C requires only 2 wires (SDA data, SCL clock) with open-drain pull-up resistors supporting multi-device addressing; SPI requires 4+ wires with higher clock speeds and dedicated chip-select lines',
        'I2C transmits at 10 Gigabits per second over optical fiber',
        'SPI can only connect a single device in the universe',
        'I2C requires separate power supplies for every single byte'
      ],
      correctAnswer: 0,
      explanation: 'I2C uses two bidirectional open-drain lines (SDA/SCL) addressing up to 127 devices via 7-bit addresses. SPI is a 4-wire full-duplex protocol offering significantly higher throughput.',
      difficulty: 'medium'
    },
    {
      id: 'emb-2',
      category: 'backend_systems',
      categoryName: 'Real-Time Operating Systems (RTOS)',
      question: 'In an RTOS (like FreeRTOS or Zephyr), what is Priority Inversion and how does Priority Inheritance resolve it?',
      options: [
        'A high-priority task is blocked by a low-priority task holding a shared resource; Priority Inheritance temporarily elevates the low-priority task to the high priority level to release the mutex',
        'Tasks with odd priority numbers are executed in reverse order',
        'The CPU clock speed is doubled during high-priority tasks',
        'The memory heap is cleared whenever a priority inverted interrupt fires'
      ],
      correctAnswer: 0,
      explanation: 'Priority inversion happens when a medium task preempts a low task that holds a lock needed by a high task. Priority inheritance elevates the lock holder until release, unblocking the system.',
      difficulty: 'hard'
    },
    {
      id: 'emb-3',
      category: 'cloud_devops',
      categoryName: 'IoT Protocols & Telemetry',
      question: 'Why is MQTT (Message Queuing Telemetry Transport) preferred over HTTP for low-power battery-operated IoT sensors transmitting over cellular/satellite?',
      options: [
        'MQTT has a minimal 2-byte header overhead, persistent TCP connection, and Quality of Service (QoS) levels tailored for constrained networks',
        'MQTT requires 400 megabyte JSON requests',
        'HTTP cannot transmit numeric values',
        'MQTT encrypts data using mechanical hardware relays'
      ],
      correctAnswer: 0,
      explanation: 'HTTP entails substantial request/response header overhead and repeated TCP handshakes. MQTT is a lightweight publish-subscribe protocol with minimal packet overhead and keepalive pings.',
      difficulty: 'easy'
    },
    {
      id: 'emb-4',
      category: 'fundamentals',
      categoryName: 'Embedded C / Memory Architecture',
      question: "In embedded C programming, why must the 'volatile' qualifier be applied to variables mapped to hardware registers or modified within an Interrupt Service Routine (ISR)?",
      options: [
        'To prevent the compiler optimizer from caching the variable in a CPU register or omitting reads because it assumes external code cannot alter it',
        'To allocate the variable in cloud flash memory',
        'To make the variable read-only and immutable',
        'To automatically calculate its square root on every cycle'
      ],
      correctAnswer: 0,
      explanation: 'The volatile keyword instructs the compiler that the value can change unexpectedly (via hardware peripherals or ISRs), ensuring every access generates an actual memory read instruction.',
      difficulty: 'medium'
    },
    {
      id: 'emb-5',
      category: 'backend_systems',
      categoryName: 'Direct Memory Access (DMA)',
      question: 'What is the primary architectural benefit of configuring DMA for high-frequency sensor ADC sampling or UART transfers?',
      options: [
        'Data transfers between peripherals and memory occur autonomously on the internal bus without taxing the main CPU core with per-byte interrupts',
        'DMA multiplies CPU clock frequency by 4x',
        'DMA eliminates the need for battery power',
        'DMA converts analog voltages directly into human speech'
      ],
      correctAnswer: 0,
      explanation: 'DMA controllers offload memory bus transactions from the processor core. The CPU is only notified via a single interrupt once an entire buffer block has transferred.',
      difficulty: 'medium'
    },
    {
      id: 'emb-6',
      category: 'cloud_devops',
      categoryName: 'OTA Firmware Updates',
      question: 'In Over-The-Air (OTA) firmware update design for edge devices, what dual-partition scheme prevents bricking during a power loss midway through flashing?',
      options: [
        'A/B Partitioning (Active & Inactive slots) with hardware watchdog rollback upon boot failure',
        'Overwriting the active bootloader directly in single flash sector',
        'Deleting all memory upon update trigger',
        'Storing firmware on unencrypted EEPROM only'
      ],
      correctAnswer: 0,
      explanation: 'A/B partitioning writes the new image to the inactive slot. If validation or the watchdog timer fails during subsequent boot, the device automatically reverts to the known good slot.',
      difficulty: 'easy'
    },
    {
      id: 'emb-7',
      category: 'backend_systems',
      categoryName: 'Automotive & Industrial Networks (CAN Bus)',
      question: 'In automotive Controller Area Network (CAN 2.0B) bus architecture, how is collision-free bus arbitration achieved when two electronic control units (ECUs) transmit simultaneously?',
      options: [
        'Dominant bits (logic 0) overwrite recessive bits (logic 1); the node transmitting recessive detects the mismatch and immediately yields transmission without data destruction',
        'By disconnecting the battery for 5 milliseconds',
        'Through an external Ethernet hub with CSMA/CD',
        'Nodes transmit in alphabetical order based on VIN number'
      ],
      correctAnswer: 0,
      explanation: 'CAN uses wired-AND non-destructive bitwise arbitration. Lower numerical identifier values represent higher message priority because dominant logic 0 bits override recessive logic 1 bits.',
      difficulty: 'hard'
    },
    {
      id: 'emb-8',
      category: 'backend_systems',
      categoryName: 'Hardware Reliability & Watchdog Timers',
      question: 'What is the operational function of an Independent Hardware Watchdog Timer (IWDT) in mission-critical embedded firmware?',
      options: [
        'A free-running hardware counter that triggers a hard MCU system reset if software fails to periodically reload ("pet") it due to deadlock, infinite loop, or memory corruption',
        'It displays the current time on an LCD screen',
        'It regulates battery charging voltage',
        'It compresses source code before compilation'
      ],
      correctAnswer: 0,
      explanation: 'If the main CPU hangs in a faulted state, the hardware counter underflows/overflows, generating a hardware reset signal that restarts the system back into a known clean state.',
      difficulty: 'medium'
    },
    {
      id: 'emb-9',
      category: 'fundamentals',
      categoryName: 'Signal Conditioning & Debouncing',
      question: 'Why do mechanical push-buttons and tactile switches require software debounce algorithms or RC hardware filters in microcontroller inputs?',
      options: [
        'Mechanical contacts physically vibrate and chatter upon actuation, generating multiple rapid electrical logic transitions (false toggles) over 5-20 milliseconds',
        'To prevent high-voltage lightning strikes from entering the pin',
        'To convert analog sine waves into 64-bit floating point numbers',
        'Because buttons consume more power than the MCU core'
      ],
      correctAnswer: 0,
      explanation: 'Mechanical spring bounce creates rapid spikes lasting several milliseconds. Debouncing filters this chattering either via low-pass RC filtering or software state confirmation timers.',
      difficulty: 'easy'
    },
    {
      id: 'emb-10',
      category: 'cloud_devops',
      categoryName: 'Thread Synchronization & Queues',
      question: 'In FreeRTOS, why should a Queue or Stream Buffer be preferred over raw global shared variables for inter-task communication?',
      options: [
        'Queues provide thread-safe FIFO buffering with integrated RTOS task blocking and unblocking, preventing race conditions without spinlock CPU busy-waiting',
        'Queues eliminate the need for RAM allocations',
        'Global variables are forbidden by embedded C compilers',
        'Queues automatically encrypt data using AES-GCM'
      ],
      correctAnswer: 0,
      explanation: 'FreeRTOS queues handle atomic memory copying and put recipient tasks into blocked sleep until data arrives, conserving CPU power compared to continuous polling of global variables.',
      difficulty: 'medium'
    },
    {
      id: 'emb-11',
      category: 'backend_systems',
      categoryName: 'Microcontroller Clocks & PLL',
      question: 'In embedded hardware architecture, why is an external Phase-Locked Loop (PLL) synthesizer utilized alongside low-frequency quartz crystals (e.g. 32.768 kHz or 8 MHz)?',
      options: [
        'To multiply the stable crystal base frequency up to high operating core speeds (e.g. 168 MHz) while keeping board power and component costs low',
        'To invert digital logic signals across input GPIO pins',
        'To eliminate the need for grounding planes on PCBs',
        'To convert alternating current into high-voltage direct current'
      ],
      correctAnswer: 0,
      explanation: 'Low-frequency crystals provide temperature stability and low power. The on-chip PLL multiplies this reference frequency to provide high-speed core and peripheral clocks.',
      difficulty: 'medium'
    },
    {
      id: 'emb-12',
      category: 'cloud_devops',
      categoryName: 'Low-Power Wireless Networks (BLE & LoRaWAN)',
      question: 'What architectural characteristic enables LoRaWAN sensors to achieve transmission ranges exceeding 10 kilometers on small coin-cell batteries?',
      options: [
        'Chirp Spread Spectrum (CSS) modulation with high receiver sensitivity below the thermal noise floor and ultra-low duty-cycle sleep states',
        'Continuous high-power 2.4 GHz microwave radiation broadcasting',
        'Satellite dish arrays integrated into sensor circuit boards',
        'High-bandwidth uncompressed video streaming modes'
      ],
      correctAnswer: 0,
      explanation: 'LoRaWAN exploits CSS modulation to demodulate signals 20dB below noise levels, trading bit rate for extraordinary link margin and minimal standby power.',
      difficulty: 'easy'
    },
    {
      id: 'emb-13',
      category: 'fundamentals',
      categoryName: 'Interrupt Latency & Vector Tables',
      question: 'In ARM Cortex-M processors (NVIC), what is "Tail-Chaining" and how does it optimize interrupt latency during nested ISR execution?',
      options: [
        'It skips full context restore and unstacking/stacking registers when moving from one pending ISR directly to another, reducing switch time to just 6 clock cycles',
        'It connects peripheral serial buses in a physical daisy chain loop',
        'It cancels all pending timer interrupts during division operations',
        'It halts the CPU clock until human intervention'
      ],
      correctAnswer: 0,
      explanation: 'Tail-chaining avoids wasteful push/pop stack cycles between consecutive interrupts, accelerating real-time responsiveness in Cortex-M interrupt controllers.',
      difficulty: 'hard'
    },
    {
      id: 'emb-14',
      category: 'backend_systems',
      categoryName: 'Analog-to-Digital Conversion (ADC) & Nyquist',
      question: 'According to the Nyquist-Shannon sampling theorem, what minimum sampling rate (f_s) is required to accurately reconstruct an analog sensor signal with highest frequency component f_max without aliasing?',
      options: [
        'f_s must be strictly greater than twice the maximum frequency component (f_s > 2 * f_max), paired with an anti-aliasing low-pass analog filter',
        'f_s must equal exactly f_max divided by 4',
        'f_s must match the CPU core clock frequency in gigahertz',
        'Sampling rate does not affect analog signal reconstruction accuracy'
      ],
      correctAnswer: 0,
      explanation: 'Sampling below 2*f_max causes high-frequency components to alias into lower audible/measurable spectrums as counterfeit phantom signals.',
      difficulty: 'medium'
    },
    {
      id: 'emb-15',
      category: 'cloud_devops',
      categoryName: 'Secure Boot & Hardware Root of Trust',
      question: 'In IoT edge device security, how does a Hardware Root of Trust (e.g. Cryptographic Co-processor or eFuse public key hash) guarantee firmware integrity at power-on?',
      options: [
        'ROM bootloader verifies the digital signature of the secondary bootloader image against an immutable public key burned into hardware before transferring execution',
        'By wiping device firmware every 24 hours automatically',
        'By requiring manual password entry on an external keypad during each boot',
        'Through biometric fingerprint authentication of cloud server administrators'
      ],
      correctAnswer: 0,
      explanation: 'Secure Boot forms an unbroken chain of trust: immutable ROM code verifies stage 1 bootloader cryptographic signatures, which in turn verifies the OS/kernel image before execution.',
      difficulty: 'hard'
    }
  ],

  // 7. Mechanical Design & CAD/CAM Engineer
  'Mechanical Design & CAD/CAM Engineer': [
    {
      id: 'mech-1',
      category: 'fundamentals',
      categoryName: 'Continuum Mechanics & FEA',
      question: 'In finite element stress analysis for ductile metallic materials subjected to multiaxial loading, why is the von Mises yield criterion preferred over Rankine maximum principal stress theory?',
      options: [
        'Because von Mises considers distortion energy, predicting plastic yielding under combined shear and normal stresses with superior experimental alignment for ductile metals',
        'Because Rankine theory is only valid for compressible gas fluids',
        'Because von Mises eliminates all computational necessity for Poisson ratio',
        'Because Rankine theory requires cryogenic operating temperatures'
      ],
      correctAnswer: 0,
      explanation: 'The distortion energy theory (von Mises criterion) best models ductile material shear failure and plastic deformation under complex multiaxial states.',
      difficulty: 'hard'
    },
    {
      id: 'mech-2',
      category: 'backend_systems',
      categoryName: 'Additive & CNC Manufacturing',
      question: 'In CNC precision machining and G-code generation, what is the role of cutter radius compensation (G41 / G42)?',
      options: [
        'It increases the spindle motor RPM by 200%',
        'It shifts the programmed tool path automatically by the tool radius offset to maintain exact finished part dimensional tolerances',
        'It sprays high-pressure coolant directly on the tool tip',
        'It shuts off electric current when feed rate drops to zero'
      ],
      correctAnswer: 1,
      explanation: 'G41 (cutter left) and G42 (cutter right) compensate for tool radius offset relative to the programmed workpiece contour.',
      difficulty: 'medium'
    },
    {
      id: 'mech-3',
      category: 'fundamentals',
      categoryName: 'Thermodynamics & Heat Transfer',
      question: 'What is the physical significance of the dimensionless Reynolds Number (Re) in internal pipe fluid and thermal flow analysis?',
      options: [
        'The ratio of inertial forces to viscous forces, characterizing laminar versus turbulent fluid flow regimes',
        'The ratio of thermal conductivity to electrical resistivity',
        'The acoustic speed of sound through solid titanium alloys',
        'The gravitational acceleration coefficient on inclined planes'
      ],
      correctAnswer: 0,
      explanation: 'Reynolds number (Re = rho * v * D / mu) quantifies the relative importance of fluid inertial forces compared to viscous resistance forces.',
      difficulty: 'easy'
    },
    {
      id: 'mech-4',
      category: 'fundamentals',
      categoryName: 'Geometric Dimensioning & Tolerancing (GD&T)',
      question: 'In ASME Y14.5 GD&T standards, what does the True Position tolerance zone define for a circular hole feature under Maximum Material Condition (MMC)?',
      options: [
        'A cylindrical tolerance zone within which the center axis of the hole must lie, permitting bonus tolerance as the hole departs from MMC toward LMC',
        'The physical weight limit of the metallic workpiece',
        'The minimum drill bit temperature',
        'A square box tolerance measured exclusively with vernier calipers'
      ],
      correctAnswer: 0,
      explanation: 'Position tolerance at MMC establishes a cylindrical boundary located at the true theoretical coordinates, granting bonus geometric tolerance as the feature size grows larger than minimum specification.',
      difficulty: 'hard'
    },
    {
      id: 'mech-5',
      category: 'backend_systems',
      categoryName: 'Fatigue & Dynamic Durability',
      question: 'In cyclical mechanical fatigue analysis, what is the significance of the Endurance Limit (Fatigue Limit) on a Wöhler S-N curve for ferrous steels?',
      options: [
        'The cyclic stress amplitude below which the material can theoretically endure an infinite number of stress cycles without fatigue failure',
        'The maximum melting temperature under friction',
        'The point of instantaneous ductile cup-and-cone fracture',
        'The speed at which cracks travel through rubber polymers'
      ],
      correctAnswer: 0,
      explanation: 'Ferrous steels exhibit a distinct horizontal plateau on the S-N curve. Alternating stresses kept beneath this endurance limit will not nucleate fatigue micro-cracks indefinitely.',
      difficulty: 'medium'
    },
    {
      id: 'mech-6',
      category: 'fundamentals',
      categoryName: 'Topology Optimization & Generative Design',
      question: 'What is the mathematical objective of the SIMP (Solid Isotropic Material with Penalization) method in structural topology optimization?',
      options: [
        'Distribute pseudo-density values across finite element voxels to maximize structural stiffness (minimize compliance) for a specified volume fraction target',
        'Simulate aerodynamic drag around sports cars in virtual wind tunnels',
        'Calculate CNC cutting oil viscosities',
        'Eliminate all triangular mesh elements from CAD models'
      ],
      correctAnswer: 0,
      explanation: 'SIMP penalizes intermediate density values to push element densities toward 0 (void) or 1 (solid), generating optimal organic load paths that maximize structural stiffness per kilogram of material.',
      difficulty: 'hard'
    },
    {
      id: 'mech-7',
      category: 'cloud_devops',
      categoryName: 'Computational Fluid Dynamics (CFD)',
      question: 'In CFD boundary layer meshing for wall-bounded turbulent flows, why is calculating the non-dimensional wall distance (y+) critical?',
      options: [
        'Ensures the first grid cell adjacent to the solid wall resolves the viscous sublayer (y+ ~ 1) or matches logarithmic wall function assumptions (y+ ~ 30-300)',
        'Determines the color palette of 3D velocity vectors',
        'Prevents fluid particles from crossing Mach 1',
        'Regulates CPU motherboard bus clock frequency'
      ],
      correctAnswer: 0,
      explanation: 'y+ measures normalized distance from the wall based on friction velocity and kinematic viscosity. Accurate y+ meshing is necessary to properly capture boundary layer shear stresses and separation.',
      difficulty: 'hard'
    },
    {
      id: 'mech-8',
      category: 'backend_systems',
      categoryName: 'Injection Molding & DFM',
      question: 'In Design for Manufacturing (DFM) of plastic injection molded components, why must vertical ribs and wall features incorporate Draft Angles (typically 1° to 2°)?',
      options: [
        'Facilitates clean part ejection from core and cavity mold halves without surface scratching, drag marks, or high ejection pin stress',
        'Reduces the cost of plastic resin pellets by 50%',
        'Makes the finished plastic part completely fireproof',
        'Prevents laser engraving machines from overheating'
      ],
      correctAnswer: 0,
      explanation: 'Draft angles introduce slight taper along the parting draw direction so that as the mold opens, the part immediately releases from the mold steel surface rather than rubbing during ejection.',
      difficulty: 'easy'
    },
    {
      id: 'mech-9',
      category: 'fundamentals',
      categoryName: 'Geometric Dimensioning & Tolerancing (GD&T)',
      question: 'In ASME Y14.5 GD&T standards, what is the Maximum Material Condition (MMC - circled M modifier) and what advantage does it provide in machining quality control?',
      options: [
        'Condition where a feature contains maximum material within tolerance limits (smallest hole / largest shaft), granting bonus tolerance as the feature deviates toward LMC',
        'Mandates that raw metal billets must weigh at least 500 kilograms',
        'Forces CNC machines to operate at maximum cutting feed rate',
        'Prohibits any coordinate measurement machine (CMM) inspection'
      ],
      correctAnswer: 0,
      explanation: 'MMC defines the state of maximum part weight/material. Applying MMC allows bonus positional tolerance equal to the difference between actual produced size and MMC size, drastically reducing scrap rates.',
      difficulty: 'medium'
    },
    {
      id: 'mech-10',
      category: 'fundamentals',
      categoryName: 'Fatigue Life & S-N Curves (Wöhler)',
      question: 'In cyclic fatigue analysis of ferrous metals, what does the "Endurance Limit" (or Fatigue Limit) represent on a Wöhler S-N curve?',
      options: [
        'The stress amplitude threshold below which a specimen can theoretically withstand an infinite number of load cycles without fatigue failure',
        'The absolute maximum temperature steel can endure before melting',
        'The yield stress measured in a single rapid tensile pull test',
        'The minimum RPM required to start an internal combustion engine'
      ],
      correctAnswer: 0,
      explanation: 'Ferrous alloys (steels) exhibit a distinct plateau in S-N curves: stress levels below this endurance limit do not cause fatigue crack propagation under millions of cycles.',
      difficulty: 'medium'
    },
    {
      id: 'mech-11',
      category: 'backend_systems',
      categoryName: 'Rotordynamics & Vibration Analysis',
      question: 'What dynamic phenomenon occurs when the rotational frequency of a high-speed turbo-shaft coincides with its natural undamped bending frequency?',
      options: [
        'Resonance occurs, reaching "Critical Speed" with severe vibration amplitude amplification that can destroy bearings without proper damping',
        'The shaft begins rotating backwards automatically',
        'Vibrations completely vanish due to aerodynamic levitation',
        'The oil lubricity increases tenfold'
      ],
      correctAnswer: 0,
      explanation: 'At critical speeds, rotational unbalance forces synchronize with structural natural modes, creating destructive resonance unless damped or transitioned through rapidly.',
      difficulty: 'hard'
    },
    {
      id: 'mech-12',
      category: 'fundamentals',
      categoryName: 'Thermodynamics & Brayton Cycle',
      question: 'In aeroderivative gas turbine engines operating on the open Brayton cycle, what thermodynamic parameter primarily governs overall thermal efficiency?',
      options: [
        'Pressure ratio across the compressor (r_p) and turbine inlet temperature (TIT)',
        'Ambient humidity percentage in the intake silencer',
        'Color of the exhaust nozzle thermal insulation blanket',
        'Length of the fuel delivery pipeline'
      ],
      correctAnswer: 0,
      explanation: 'Ideal Brayton cycle efficiency depends directly on the pressure ratio and the specific heat ratio gamma: eta = 1 - (1 / r_p^((gamma - 1)/gamma)). Higher peak turbine inlet temperatures increase work output.',
      difficulty: 'medium'
    },
    {
      id: 'mech-13',
      category: 'cloud_devops',
      categoryName: 'Kinematics & Denavit-Hartenberg (DH)',
      question: 'In robotics and spatial mechanisms, what is the purpose of the 4 Denavit-Hartenberg (DH) parameters (theta, d, a, alpha)?',
      options: [
        'Standard convention for attaching reference coordinate frames to serial manipulator links, defining transformation matrices between successive joint axes',
        'Algorithm for estimating robot manufacturing cost in USD',
        'Calculating battery discharge currents in autonomous mobile robots',
        'Controlling pneumatic air pressure in robotic vacuum suction cups'
      ],
      correctAnswer: 0,
      explanation: 'The standard DH parameters parameterize serial robotic kinematics: joint angle, link offset, link length, and link twist to compute forward kinematic end-effector poses.',
      difficulty: 'hard'
    },
    {
      id: 'mech-14',
      category: 'backend_systems',
      categoryName: 'Material Selection & Ashby Charts',
      question: 'In mechanical engineering design optimization, how do Ashby Selection Charts guide material choice for lightweight bending-stiffness critical beams?',
      options: [
        'By maximizing performance index metrics such as E^(1/2) / rho (Young\'s modulus over density) on logarithmic property property cross-plots',
        'By choosing whichever material has the lowest alphabetical name',
        'By selecting the densest lead alloy available',
        'By evaluating tensile strength without considering material weight'
      ],
      correctAnswer: 0,
      explanation: 'Ashby charts plot material properties logarithmically. For a beam in bending requiring minimal mass for target stiffness, the optimal index is E^(1/2) / rho.',
      difficulty: 'easy'
    },
    {
      id: 'mech-15',
      category: 'cloud_devops',
      categoryName: 'Non-Destructive Testing (NDT)',
      question: 'Why is Phased Array Ultrasonic Testing (PAUT) preferred over conventional single-probe radiography for inspecting thick circumferential girth welds in high-pressure steam pipelines?',
      options: [
        'PAUT steers and focuses multi-angle acoustic sound beams electronically, detecting planar flaws with depth sizing in real-time without ionizing radiation hazards or plant evacuation',
        'PAUT requires burning coal to generate ultrasonic vibrations',
        'Radiography cannot penetrate metal thicker than 1 millimeter',
        'PAUT eliminates all surface cleaning requirements on pipe walls'
      ],
      correctAnswer: 0,
      explanation: 'PAUT pulses an array of piezoelectric elements with controlled time delays to steer the acoustic beam across a range of angles, mapping weld defects with high precision safely without radiation boundaries.',
      difficulty: 'easy'
    }
  ],

  // 8. Structural Analysis & Design Engineer
  'Structural Analysis & Design Engineer': [
    {
      id: 'civ-1',
      category: 'fundamentals',
      categoryName: 'Limit State Design (LSM)',
      question: 'According to IS 456 / Eurocode 2 structural standards, what is the fundamental difference between Limit State of Collapse and Limit State of Serviceability?',
      options: [
        'Collapse governs structural integrity against total failure or fracture under factored loads, while Serviceability governs deflection, cracking, and occupant comfort under service loads',
        'Collapse is only evaluated for temporary scaffolding, while Serviceability applies to foundations',
        'Serviceability requires destructive concrete core testing during every pour',
        'There is no functional difference; they use identical partial safety factors'
      ],
      correctAnswer: 0,
      explanation: 'Limit State of Collapse checks safety against catastrophic overload (flexure, shear, torsion), whereas Limit State of Serviceability ensures daily usability (deflections, vibrations, crack width limits).',
      difficulty: 'medium'
    },
    {
      id: 'civ-2',
      category: 'cloud_devops',
      categoryName: 'BIM & Parametric Modeling',
      question: 'In Building Information Modeling (BIM Level 2/3), what is the key purpose of Common Data Environment (CDE) clash detection between IFC architectural and MEP models?',
      options: [
        'Pre-identifying spatial and geometric interferences before site fabrication, minimizing costly rework during construction',
        'Printing 2D paper blueprints for municipal zoning sign-off',
        'Calculating daily worker labor wages automatically',
        'Painting exterior building facades with water-resistant primer'
      ],
      correctAnswer: 0,
      explanation: 'BIM clash detection automatically detects geometric conflicts (e.g. HVAC ducts penetrating structural concrete beams) digitally prior to physical construction.',
      difficulty: 'medium'
    },
    {
      id: 'civ-3',
      category: 'fundamentals',
      categoryName: 'Indeterminate Structural Analysis',
      question: 'In Hardy Cross Moment Distribution Method for continuous beams and frames, what does the Distribution Factor (DF) of a member at a rigid joint represent?',
      options: [
        'The proportion of unbalanced joint moment transferred to that member based on its relative rotational flexural stiffness (4EI/L or 3EI/L)',
        'The weight percentage of reinforcing rebar in concrete',
        'The curing time in days required before striking formwork',
        'The wind resistance coefficient of glazing panels'
      ],
      correctAnswer: 0,
      explanation: 'Distribution Factor DF_i = K_i / sum(K), dividing the unbalanced locking moment among converging members according to their rotational stiffness.',
      difficulty: 'medium'
    },
    {
      id: 'civ-4',
      category: 'fundamentals',
      categoryName: 'Seismic Design & Response Spectrum (IS 1893)',
      question: 'Under IS 1893 / ASCE 7 seismic codes, why is the Response Reduction Factor (R) applied to calculate design horizontal seismic base shear (V_b)?',
      options: [
        'Accounts for the structure\'s inherent ductility, overstrength, and energy dissipation capacity in the inelastic range during severe earthquakes',
        'Reduces concrete cement content to prevent thermal cracking',
        'Compensates for crane operator blind spots on construction sites',
        'Increases foundation depth by a factor of 10'
      ],
      correctAnswer: 0,
      explanation: 'Structures designed to deform inelastically without brittle collapse absorb kinetic energy through plastic hinges, allowing elastic seismic forces to be reduced by factor R.',
      difficulty: 'hard'
    },
    {
      id: 'civ-5',
      category: 'backend_systems',
      categoryName: 'Prestressed Concrete Technology',
      question: 'In post-tensioned prestressed concrete bridge girders, what causes long-term time-dependent prestress loss?',
      options: [
        'Concrete creep, drying shrinkage of concrete, and steel relaxation of high-tensile prestressing strands',
        'Solar ultraviolet ray exposure on concrete deck slabs',
        'Rusting of external rubber bridge expansion bearings',
        'Fluctuations in vehicle traffic speeds'
      ],
      correctAnswer: 0,
      explanation: 'Prestress losses are categorized as immediate (friction, wobble, anchorage slip) and long-term (concrete creep under sustained compressive strain, drying shrinkage, and steel molecular relaxation).',
      difficulty: 'medium'
    },
    {
      id: 'civ-6',
      category: 'fundamentals',
      categoryName: 'Geotechnical & Foundation Engineering',
      question: 'According to Terzaghi\'s bearing capacity equation for shallow strip footings, what three soil mechanics mechanisms provide ultimate resistance against shear failure?',
      options: [
        'Cohesion (c*Nc), surcharge overburden pressure (q*Nq), and footing width with soil unit weight (0.5*gamma*B*Ngamma)',
        'Water table height, atmospheric air pressure, and ambient temperature',
        'Asphalt compaction, rebar density, and curing compound',
        'Gravel color, moisture evaporation, and magnetic permeability'
      ],
      correctAnswer: 0,
      explanation: 'Terzaghi\'s bearing capacity formula expresses ultimate capacity as the superposition of soil cohesion resistance, depth overburden surcharge, and soil weight within the shear failure wedge.',
      difficulty: 'hard'
    },
    {
      id: 'civ-7',
      category: 'cloud_devops',
      categoryName: 'Lateral Force Resisting Systems',
      question: 'Why are Reinforced Concrete Shear Walls significantly more effective than bare Moment Resisting Frames in high-rise buildings exceeding 20 stories?',
      options: [
        'They provide immense in-plane lateral stiffness, substantially limiting inter-story drift and preventing non-structural facade damage during wind and seismic events',
        'They allow interior rooms to be 100% soundproof',
        'They eliminate the need for foundation piles',
        'They reduce building weight by 80%'
      ],
      correctAnswer: 0,
      explanation: 'Shear walls behave as vertical cantilevers under lateral shear and bending. Their deep cross-section offers drastically higher flexural rigidity (EI) than slender column-beam frame joints.',
      difficulty: 'medium'
    },
    {
      id: 'civ-8',
      category: 'fundamentals',
      categoryName: 'Wind Engineering & Aerodynamics (IS 875 Part 3)',
      question: 'When computing design wind pressure (P_z = 0.6 * V_z^2) on a tall commercial tower, how does terrain roughness category affect the design wind speed V_z?',
      options: [
        'Dense city centers with closely spaced tall buildings generate high ground friction that decelerates low-level wind speed compared to open coastal terrain',
        'City centers speed up wind by 400% near the ground',
        'Terrain categories only apply to underground subway stations',
        'Wind speed remains identical from 0m to 500m height everywhere'
      ],
      correctAnswer: 0,
      explanation: 'Terrain roughness categories account for surface obstacles. Large city obstructions (Category 4) generate a deeper boundary friction layer that retards ground wind velocities.',
      difficulty: 'easy'
    },
    {
      id: 'civ-9',
      category: 'fundamentals',
      categoryName: 'Steel Structures & Plastic Analysis (IS 800)',
      question: 'In plastic design of structural steel beams, what does the Shape Factor (S = Z_p / Z_e) signify?',
      options: [
        'The ratio of plastic section modulus to elastic section modulus, indicating the reserve flexural capacity of a cross-section after initial yield fiber yielding occurs',
        'The aesthetic aspect ratio of the beam web to flange',
        'The paint coating thickness required to prevent atmospheric corrosion',
        'The ratio of shear area to total cross-sectional area'
      ],
      correctAnswer: 0,
      explanation: 'Shape factor represents reserve strength between first yield (M_y = f_y * Z_e) and complete plastic hinge formation (M_p = f_y * Z_p). For standard I-sections, S is typically around 1.12 to 1.15.',
      difficulty: 'medium'
    },
    {
      id: 'civ-10',
      category: 'backend_systems',
      categoryName: 'Deep Foundation Engineering (Piles)',
      question: 'In friction pile foundation design in cohesive clays, how is total pile ultimate capacity (Q_u) calculated?',
      options: [
        'Superposition of end-bearing resistance at pile tip (Q_b = A_b * 9 * c_u) and skin friction shaft resistance along the shaft perimeter (Q_s = sum(alpha * c_u * A_s))',
        'Multiplying pile diameter by the concrete batch plant capacity',
        'By testing single anchor bolts in laboratory tension machines',
        'By assuming 100% of the superstructure load is supported by soil capillary tension'
      ],
      correctAnswer: 0,
      explanation: 'Total ultimate pile resistance combines end base bearing capacity with skin adhesion friction along the embedded pile shaft in cohesive clays using the alpha adhesion method.',
      difficulty: 'hard'
    },
    {
      id: 'civ-11',
      category: 'fundamentals',
      categoryName: 'Concrete Mix Design & Durability (IS 10262)',
      question: 'In performance-based concrete mix design for marine and coastal environments, why is controlling the maximum Water-Cementitious (w/cm) ratio and minimum fly ash/GGBS dosage crucial?',
      options: [
        'To reduce concrete permeability and pore connectivity, preventing chloride ion ingress that causes depassivation and premature corrosion of steel rebar',
        'To make concrete set within 3 minutes of mixing',
        'To allow raw seawater to be used as batch mixing water',
        'To increase concrete electrical conductivity for lightning protection'
      ],
      correctAnswer: 0,
      explanation: 'Lower w/cm ratios and supplementary cementitious materials (fly ash, blast furnace slag) densify the microstructure with secondary C-S-H gel, dramatically retarding chloride penetration.',
      difficulty: 'medium'
    },
    {
      id: 'civ-12',
      category: 'cloud_devops',
      categoryName: 'Bridge Engineering & Moving Loads (IRC 6)',
      question: 'In highway bridge deck slab analysis under IRC Class 70R tracked/wheeled vehicle loading, what is the role of Courbon’s Method or Guyon-Massonnet distribution analysis?',
      options: [
        'Determining the transverse distribution of concentrated live wheel loads across longitudinal bridge girders interconnected by diaphragms',
        'Calculating the asphalt paving temperature during compaction',
        'Measuring traffic speed violations automatically on toll bridges',
        'Selecting the color of bridge stay cables'
      ],
      correctAnswer: 0,
      explanation: 'Transverse load distribution methods (Courbon for torsionally stiff diaphragms, Guyon-Massonnet for orthotropic plates) evaluate how much of a single axle wheel load is shared by each main girder.',
      difficulty: 'hard'
    },
    {
      id: 'civ-13',
      category: 'fundamentals',
      categoryName: 'Finite Element Plate & Shell Analysis',
      question: 'In finite element modeling of slab-column flat plate floors, why is Punching Shear perimeter verification at d/2 from the column face mandatory?',
      options: [
        'Because column concentration induces brittle two-way diagonal shear cracking on a truncated cone failure surface, which can cause progressive floor collapse without drop panels or stirrups',
        'To check for water pipe leakage inside the concrete slab',
        'Because concrete shrinks 10% more around columns than mid-span',
        'Punching shear only occurs in structural steel trusses'
      ],
      correctAnswer: 0,
      explanation: 'Punching shear is a catastrophic brittle two-way shear failure occurring around concentrated column supports. Design codes verify shear stress along a critical perimeter at distance d/2 from column faces.',
      difficulty: 'medium'
    },
    {
      id: 'civ-14',
      category: 'backend_systems',
      categoryName: 'Earth Retaining Structures (Rankine & Coulomb)',
      question: 'Under Rankine earth pressure theory, why is Active earth pressure coefficient (K_a) strictly lower than Passive earth pressure coefficient (K_p)?',
      options: [
        'Active pressure occurs when the wall moves away from the soil allowing internal shear strength to assist equilibrium (K_a = (1-sin phi)/(1+sin phi)); passive occurs when the wall drives into the soil mobilizing full passive resistance (K_p = 1/K_a)',
        'Active pressure only applies when the ground is frozen',
        'Passive pressure ignores all soil friction angle parameters',
        'Active and passive earth pressures are equal in all soil types'
      ],
      correctAnswer: 0,
      explanation: 'Active state involves soil expansion and relaxation away from the retaining wall (lower pressure), while passive state compresses the soil mass to ultimate shearing failure (significantly higher pressure).',
      difficulty: 'easy'
    },
    {
      id: 'civ-15',
      category: 'cloud_devops',
      categoryName: 'Tuned Mass Dampers & Structural Dynamics',
      question: 'In supertall skyscrapers (such as Taipei 101), how does a Tuned Mass Damper (TMD) attenuate wind-induced vortex shedding oscillations?',
      options: [
        'The secondary suspended pendulum mass is tuned to the building’s fundamental vibration mode, oscillating out of phase to absorb and dissipate kinetic energy via hydraulic dampers',
        'By venting compressed air out of rooftop louvers to push the building upright',
        'By automatically lowering the building height into underground bedrock silos during storms',
        'Through gyroscopic jet thrusters attached to corner facade mullions'
      ],
      correctAnswer: 0,
      explanation: 'A TMD consists of a large tuned inertial mass and dashpot dampers. When the structure vibrates near its resonance frequency, the TMD oscillates out of phase, absorbing mechanical kinetic energy and damping accelerations.',
      difficulty: 'easy'
    }
  ],

  // 9. Clinical Research & Diagnostics Associate
  'Clinical Research & Diagnostics Associate': [
    {
      id: 'med-1',
      category: 'fundamentals',
      categoryName: 'Clinical Trial Methodology & GCP',
      question: 'In evidence-based clinical trial design conforming to ICH-GCP guidelines, what is the defining characteristic of a Double-Blind Randomized Controlled Trial (RCT)?',
      options: [
        'Neither the participating subjects nor the assessing clinical researchers know who receives the investigational drug versus placebo',
        'The hospital pharmacy dispenses generic drugs without batch lot tracking',
        'Patients are allowed to choose their preferred therapeutic dosage daily',
        'Results are kept secret from institutional ethics review boards'
      ],
      correctAnswer: 0,
      explanation: 'Double-blinding prevents both observational bias by clinical investigators and psychological placebo effect bias by participants.',
      difficulty: 'medium'
    },
    {
      id: 'med-2',
      category: 'backend_systems',
      categoryName: 'Diagnostic Biomarkers & Pharmacology',
      question: 'In clinical diagnostic laboratory testing, what does the diagnostic "Specificity" of an assay quantify?',
      options: [
        'The proportion of true disease-negative individuals who are correctly identified as negative by the test',
        'The speed in seconds required for centrifuge sample separation',
        'The total cost of reagents per patient sample',
        'The percentage of samples that produce false positive results'
      ],
      correctAnswer: 0,
      explanation: 'Specificity = TN / (TN + FP), measuring the ability of an assay to correctly identify non-diseased individuals without false positives.',
      difficulty: 'easy'
    },
    {
      id: 'med-3',
      category: 'fundamentals',
      categoryName: 'Pharmacokinetics vs Pharmacodynamics',
      question: 'In pharmacology and drug development, how are Pharmacokinetics (PK) and Pharmacodynamics (PD) differentiated?',
      options: [
        'Pharmacokinetics describes what the body does to the drug (ADME: Absorption, Distribution, Metabolism, Excretion); Pharmacodynamics describes what the drug does to the body (biochemical & physiological effects)',
        'Pharmacokinetics applies to animal trials only; Pharmacodynamics applies to plant biology',
        'Pharmacokinetics calculates tablet expiration dates',
        'Both terms represent identical blood pressure readings'
      ],
      correctAnswer: 0,
      explanation: 'PK focuses on drug concentration-time profiles throughout biological tissues, whereas PD evaluates receptor binding, therapeutic efficacy, and dose-response biochemical outcomes.',
      difficulty: 'medium'
    },
    {
      id: 'med-4',
      category: 'backend_systems',
      categoryName: 'Molecular Diagnostics & qPCR',
      question: 'In quantitative Real-Time PCR (qPCR) pathogen detection, what is the inverse relationship between the quantification cycle (C_q or C_t) value and starting target viral load?',
      options: [
        'Lower C_t values denote higher starting nucleic acid copy numbers because fewer thermal amplification cycles were needed to cross the exponential fluorescence threshold',
        'Lower C_t values mean no viral RNA is present in the patient sample',
        'C_t values represent patient body temperature in Fahrenheit',
        'There is zero mathematical correlation between cycle count and viral concentration'
      ],
      correctAnswer: 0,
      explanation: 'Each PCR cycle approximately doubles the amplicon DNA. Abundant target templates reach detectable fluorescence early (low C_t), whereas minute viral concentrations require many cycles (high C_t).',
      difficulty: 'easy'
    },
    {
      id: 'med-5',
      category: 'cloud_devops',
      categoryName: 'Pharmacovigilance & Adverse Events (MedDRA)',
      question: 'In post-marketing drug safety and clinical trial pharmacovigilance, what constitutes a Serious Adverse Event (SAE) requiring expedited 7-day or 15-day regulatory reporting to FDA/CDSCO?',
      options: [
        'Any untoward medical occurrence that results in death, life-threatening situation, inpatient hospitalization/prolongation, persistent disability, or congenital anomaly',
        'A patient requesting a flavor change for their oral antibiotic syrup',
        'A minor headache that resolves within 10 minutes without medication',
        'A scheduled routine eye exam checkup'
      ],
      correctAnswer: 0,
      explanation: 'SAE criteria are strictly codified by ICH E2A. Adverse events resulting in mortality, life endangerment, hospitalization, or permanent incapacity trigger mandatory expedited regulatory reporting.',
      difficulty: 'medium'
    },
    {
      id: 'med-6',
      category: 'fundamentals',
      categoryName: 'Biomarker Immunoassays (ELISA)',
      question: 'Why is a Sandwich ELISA assay inherently more specific than a Direct ELISA for quantifying low-abundance human serum cytokines (e.g. IL-6 or TNF-alpha)?',
      options: [
        'It requires two separate epitope-specific antibodies (a capture antibody and a detection antibody) that must both bind distinct epitopes on the target antigen',
        'It converts fluorescent light into radio waves',
        'It requires half the volume of blood serum',
        'Direct ELISA does not use antibodies'
      ],
      correctAnswer: 0,
      explanation: 'Sandwich ELISA sandwiches the analyte between matched antibody pairs. Non-specific cross-reacting proteins will not bind both antibodies simultaneously, virtually eliminating false-positive background signal.',
      difficulty: 'hard'
    },
    {
      id: 'med-7',
      category: 'cloud_devops',
      categoryName: 'Health Data Governance (HIPAA / DISHA)',
      question: 'Under modern clinical health privacy regulations, what is the primary technical requirement for de-identifying Electronic Health Records (EHR) before secondary research publication?',
      options: [
        'Removing or cryptographically tokenizing all 18 HIPAA Direct Identifiers (names, dates, MRN numbers, IP addresses, biometric identifiers) preventing patient re-identification',
        'Encrypting patient records with a 4-digit PIN stored in browser memory',
        'Printing patient records and shredding the paper copies',
        'Translating English clinical notes into Latin'
      ],
      correctAnswer: 0,
      explanation: 'Safe Harbor de-identification mandates the excision of 18 specific categories of personal health identifiers (PHI) so patient records cannot be cross-referenced back to individuals.',
      difficulty: 'easy'
    },
    {
      id: 'med-8',
      category: 'fundamentals',
      categoryName: 'Clinical Trial Phases & Endpoints',
      question: 'What is the primary objective and cohort size characteristic of a Phase I Clinical Trial in oncology drug development?',
      options: [
        'Evaluate human safety, tolerability, pharmacokinetics, and determine Maximum Tolerated Dose (MTD) in a small cohort (20-80 subjects) using dose-escalation cohorts',
        'Confirm definitive clinical efficacy across 10,000 randomized patients globally',
        'Manufacture 1 million commercial drug vials for retail pharmacy sale',
        'Test veterinary safety in deep-sea marine animals'
      ],
      correctAnswer: 0,
      explanation: 'Phase I is the first-in-human stage designed to ascertain initial pharmacokinetic properties, dose-limiting toxicities (DLTs), and establish the recommended Phase 2 dose (RP2D).',
      difficulty: 'medium'
    },
    {
      id: 'med-9',
      category: 'fundamentals',
      categoryName: 'Institutional Ethics & Declaration of Helsinki',
      question: 'Under the Declaration of Helsinki and ICMR ethical guidelines, what is the mandatory function of an Institutional Ethics Committee (IEC / IRB) before initiating human research?',
      options: [
        'Independent review to ensure trial protocol safeguards human rights, favorable risk-to-benefit ratio, voluntary informed consent, and equitable participant selection',
        'Auditing hospital cafeteria food hygiene certificates',
        'Approving commercial marketing slogans for pharmaceutical commercials',
        'Determining the retail sale price of clinical laboratory test tubes'
      ],
      correctAnswer: 0,
      explanation: 'IRBs/IECs provide independent oversight to protect vulnerable subjects, requiring ethical scrutiny of protocol design, risks, benefits, and informed consent procedures.',
      difficulty: 'easy'
    },
    {
      id: 'med-10',
      category: 'backend_systems',
      categoryName: 'Next-Generation Sequencing (NGS) Diagnostics',
      question: 'In molecular oncology diagnostics using Next-Generation Sequencing (NGS), what is meant by "Sequencing Depth" (or Coverage, e.g. 500x)?',
      options: [
        'The average number of times a specific nucleotide position is sequenced across independent mapped reads, determining sensitivity for detecting low-frequency somatic mutations',
        'The physical length of DNA strands measured in centimeters',
        'The depth in millimeters of the glass flowcell fluid channel',
        'The number of months required to complete genetic analysis'
      ],
      correctAnswer: 0,
      explanation: 'High coverage/depth (e.g. 500x–1000x in targeted cancer panels) ensures rare subclonal somatic variants and circulating tumor DNA (ctDNA) can be reliably distinguished from sequencing errors.',
      difficulty: 'medium'
    },
    {
      id: 'med-11',
      category: 'fundamentals',
      categoryName: 'Therapeutic Drug Monitoring (TDM)',
      question: 'Why is Therapeutic Drug Monitoring (TDM) clinically mandatory for drugs with a Narrow Therapeutic Index (NTI, e.g. Digoxin, Lithium, Gentamicin)?',
      options: [
        'Because the therapeutic concentration range is extremely close to the toxic plasma threshold, requiring blood serum titer monitoring to balance efficacy with organ safety',
        'To prevent patients from becoming addicted to vitamins',
        'Because generic medications lose potency after 24 hours in the body',
        'TDM is only required for over-the-counter cough lozenges'
      ],
      correctAnswer: 0,
      explanation: 'NTI medications exhibit small margins between effective therapeutic trough levels and severe adverse toxicities (e.g. ototoxicity, nephrotoxicity, arrhythmias), mandating routine serum titer checks.',
      difficulty: 'medium'
    },
    {
      id: 'med-12',
      category: 'cloud_devops',
      categoryName: 'Clinical Data Management (CDISC & SDTM)',
      question: 'In regulatory clinical submission packages to FDA/EMA, what is the role of the CDISC Study Data Tabulation Model (SDTM)?',
      options: [
        'Standardized machine-readable data architecture defining domains (e.g. Demographics, Adverse Events, Lab Findings) for consistent regulatory aggregation and analysis',
        'A social networking portal for clinical trial participants',
        'An encryption key for hospital electronic prescription pads',
        'A barcode printing protocol for blood sample vials'
      ],
      correctAnswer: 0,
      explanation: 'CDISC SDTM establishes standard variables and domain tables across clinical studies, enabling regulatory agencies to review trial data efficiently with automated analytical scripts.',
      difficulty: 'hard'
    },
    {
      id: 'med-13',
      category: 'fundamentals',
      categoryName: 'Biostatistics & Kaplan-Meier Survival Curves',
      question: 'In oncology clinical efficacy trials, how does the Kaplan-Meier estimator handle "Censored" patient data when evaluating Overall Survival (OS) or Progression-Free Survival (PFS)?',
      options: [
        'Subjects who are lost to follow-up, withdraw consent, or remain event-free at study closeout contribute information up to their last observation time without falsely assuming death',
        'Censored subjects are deleted from all trial statistics retroactively',
        'Censored patients are counted as immediate drug treatment failures',
        'Survival time for censored patients is assumed to be zero days'
      ],
      correctAnswer: 0,
      explanation: 'Right-censoring preserves information from patients who did not experience the event during observation, properly computing survival probabilities without introducing survival bias.',
      difficulty: 'hard'
    },
    {
      id: 'med-14',
      category: 'backend_systems',
      categoryName: 'Clinical Laboratory Quality Control (Westgard Rules)',
      question: 'In clinical chemistry analyzers, what automated alert action is triggered when an internal quality control (QC) run violates the 1_3s Westgard Rule?',
      options: [
        'Rejection of the analytical run because a control observation exceeds the mean by more than 3 standard deviations, indicating acute random error or severe reagent drift',
        'Immediate shipment of patient results to doctors',
        'Doubling the clinical lab billing fee',
        'Switching the analyzer into diagnostic demonstration mode'
      ],
      correctAnswer: 0,
      explanation: 'The 1_3s rule is a cardinal rejection rule detecting catastrophic random errors or major systematic shifts, requiring patient sample processing to pause until troubleshooting.',
      difficulty: 'easy'
    },
    {
      id: 'med-15',
      category: 'cloud_devops',
      categoryName: 'Drug Stability Testing (ICH Q1A)',
      question: 'According to ICH Q1A(R2) harmonized guidelines, what accelerated stability testing conditions (temperature & relative humidity) are required to project commercial drug shelf-life?',
      options: [
        '40°C ± 2°C / 75% RH ± 5% RH for a minimum duration of 6 months',
        '0°C / 10% RH for 24 hours',
        '100°C / 100% RH boiling water immersion for 1 hour',
        '25°C ambient air storage without humidity control'
      ],
      correctAnswer: 0,
      explanation: 'ICH Q1A mandates 40°C/75% RH accelerated conditions to induce thermal and moisture degradation kinetics, supporting preliminary shelf-life estimations alongside long-term 25°C/60% RH studies.',
      difficulty: 'easy'
    }
  ],

  // 10. Corporate Legal Counsel & Compliance Officer
  'Corporate Legal Counsel & Compliance Officer': [
    {
      id: 'law-1',
      category: 'fundamentals',
      categoryName: 'Contract Law & Commercial Drafting',
      question: 'In international commercial agreements, what is the legal purpose of a "Liquidated Damages" clause compared to a punitive penalty clause?',
      options: [
        'It constitutes a genuine pre-estimate of loss agreed by the parties upon breach, which is legally enforceable unlike punitive penalties designed to terrify a defaulting party',
        'It automatically cancels all corporate tax liabilities under state statutes',
        'It transfers company intellectual property to bankruptcy receivers',
        'It grants board voting rights to external litigation funders'
      ],
      correctAnswer: 0,
      explanation: 'Courts enforce liquidated damages when they represent a reasonable forecast of just compensation for anticipated harm, while penal clauses designed purely as punishment are void.',
      difficulty: 'medium'
    },
    {
      id: 'law-2',
      category: 'backend_systems',
      categoryName: 'Intellectual Property & Corporate Governance',
      question: 'What legal principle governs corporate director fiduciary responsibilities under modern Company Law (e.g. Section 166 of Companies Act)?',
      options: [
        'Duty to act in good faith to promote the objects of the company for the benefit of its members and stakeholders as a whole, exercising reasonable care and independent judgment',
        'Duty to prioritize personal executive bonus payouts over creditor solvency',
        'Immunity from all regulatory investigations once shares are listed on stock exchanges',
        'Obligation to sign confidentiality waivers for all competitors'
      ],
      correctAnswer: 0,
      explanation: 'Directors owe fiduciary duties of good faith, due care, prevention of conflicts of interest, and promotion of broad stakeholder interests.',
      difficulty: 'easy'
    },
    {
      id: 'law-3',
      category: 'fundamentals',
      categoryName: 'Restraint of Trade & Non-Competes',
      question: 'Under Section 27 of the Indian Contract Act, 1872, what is the legal standing of post-employment non-compete covenants imposed on departing employees?',
      options: [
        'Void ab initio as an unlawful restraint of lawful profession, trade, or business, regardless of geographic or temporal reasonableness',
        'Fully enforceable for up to 10 years across the country',
        'Enforceable only if approved by the Ministry of Corporate Affairs',
        'Valid if the employee was paid in company equity options'
      ],
      correctAnswer: 0,
      explanation: 'Indian courts strictly interpret Section 27: any agreement restraining someone from exercising a lawful trade or profession post-employment is void, unlike in certain US jurisdictions.',
      difficulty: 'medium'
    },
    {
      id: 'law-4',
      category: 'cloud_devops',
      categoryName: 'Data Privacy & DPDP Act 2023',
      question: 'Under the Digital Personal Data Protection (DPDP) Act 2023, what is the role and legal responsibility of a "Data Fiduciary"?',
      options: [
        'An entity that determines the purpose and means of processing personal data, bearing legal duty to implement reasonable security safeguards and report data breaches to the Data Protection Board',
        'An offshore escrow bank that stores cryptographic keys',
        'A browser cookie banner software company',
        'An employee who clicks on phishing simulation emails'
      ],
      correctAnswer: 0,
      explanation: 'Data Fiduciaries decide how and why personal data is processed, carrying statutory accountability for consent notices, data principal rights, grievance redressal, and breach reporting.',
      difficulty: 'easy'
    },
    {
      id: 'law-5',
      category: 'backend_systems',
      categoryName: 'Alternative Dispute Resolution (ADR)',
      question: 'In commercial arbitration agreements, why is specifying the "Seat" of arbitration fundamentally distinct from designating the "Venue"?',
      options: [
        'The Seat determines the lex arbitri (curial law) and vests supervisory jurisdiction in local courts to hear challenges, whereas the Venue is merely the physical geographic meeting location',
        'The Seat determines which party pays catering expenses during hearings',
        'The Venue can only be a designated United Nations building',
        'There is no distinction; Indian courts treat them interchangeably'
      ],
      correctAnswer: 0,
      explanation: 'The Seat anchors the legal domicile of the arbitration. The courts at the seat possess exclusive jurisdiction over setting-aside applications and supervisory interim relief.',
      difficulty: 'hard'
    },
    {
      id: 'law-6',
      category: 'fundamentals',
      categoryName: 'Insolvency & Bankruptcy (IBC 2016)',
      question: 'Under the Insolvency and Bankruptcy Code (IBC) 2016, what is the priority order of the distribution "Waterfall Mechanism" (Section 53) upon corporate liquidation?',
      options: [
        'Insolvency resolution process costs first, followed pari passu by workmen\'s dues (24 months) and secured creditors, then unsecured financial creditors',
        'Equity shareholders first, followed by income tax authorities',
        'Independent legal counsel first, followed by preferred shareholders',
        'Foreign vendors first, followed by the company founders'
      ],
      correctAnswer: 0,
      explanation: 'Section 53 establishes CIRP costs as paramount priority, followed by 24-month workmen dues and secured debts ranking equally, ahead of government taxes and equity holders.',
      difficulty: 'hard'
    },
    {
      id: 'law-7',
      category: 'cloud_devops',
      categoryName: 'Securities Law & Insider Trading (SEBI)',
      question: 'Under SEBI (Prohibition of Insider Trading) Regulations, what constitutes Unpublished Price Sensitive Information (UPSI)?',
      options: [
        'Any information relating to a company or its securities, directly or indirectly, not generally available which upon becoming available is likely to materially affect the price of securities (e.g. financial results, dividends, M&A)',
        'Public quarterly analyst earnings calls published on YouTube',
        'Customer support complaint tickets on social media',
        'Routine job vacancy advertisements on LinkedIn'
      ],
      correctAnswer: 0,
      explanation: 'UPSI encompasses non-public material events (earnings, capital restructuring, major contracts) that a reasonable investor would consider significant in making investment decisions.',
      difficulty: 'medium'
    },
    {
      id: 'law-8',
      category: 'backend_systems',
      categoryName: 'ESG & Business Responsibility (BRSR)',
      question: 'What is the mandatory reporting mandate of SEBI\'s Business Responsibility and Sustainability Report (BRSR) for top 1000 listed entities?',
      options: [
        'Disclose non-financial ESG metrics (greenhouse gas emissions, water stewardship, employee diversity, supply chain ethics) mapped across the 9 principles of National Guidelines on Responsible Business Conduct (NGRBC)',
        'Pay mandatory 10% annual revenues into municipal carbon tax accounts',
        'Convert all company vehicles to solar powered bicycles',
        'Replace all board members with university environmental science professors'
      ],
      correctAnswer: 0,
      explanation: 'BRSR requires quantitative and qualitative disclosures across environmental, social, and governance parameters to ensure institutional investor transparency.',
      difficulty: 'easy'
    },
    {
      id: 'law-9',
      category: 'fundamentals',
      categoryName: 'Competition Law & Anti-Trust (CCI)',
      question: 'Under the Competition Act, 2002, what criteria establish an unlawful "Abuse of Dominant Position" (Section 4) by an enterprise in a relevant market?',
      options: [
        'Directly or indirectly imposing unfair or discriminatory pricing/conditions, limiting production/technical development to prejudice consumers, or leveraging dominance to enter another market',
        'Having annual sales revenue greater than 100 Crore rupees',
        'Hiring more than 5,000 full-time employees',
        'Advertising products on national television during sports events'
      ],
      correctAnswer: 0,
      explanation: 'Holding a dominant market position is not per se illegal; however, exploiting that position to stifle competition, create barriers to entry, or impose predatory pricing violates Section 4.',
      difficulty: 'medium'
    },
    {
      id: 'law-10',
      category: 'backend_systems',
      categoryName: 'Mergers & Acquisitions Due Diligence',
      question: 'In corporate M&A share purchase agreements (SPA), what legal protection does a "Material Adverse Change" (MAC) or "Material Adverse Effect" (MAE) clause afford the acquirer?',
      options: [
        'Right to terminate the transaction before closing without penalty if unforeseen catastrophic events severely impair the target company’s business, assets, or financial viability',
        'Permission to lower employee salaries by 50% immediately post-merger',
        'Automatic exemption from stamp duty taxes on share transfers',
        'Immunity from statutory environmental audit requirements'
      ],
      correctAnswer: 0,
      explanation: 'MAE/MAC clauses allocate interim risk between signing and closing, permitting the buyer to walk away if an extraordinary negative event fundamentally alters the target’s financial foundation.',
      difficulty: 'medium'
    },
    {
      id: 'law-11',
      category: 'fundamentals',
      categoryName: 'Anti-Bribery & Prevention of Corruption (POCA / FCPA)',
      question: 'Under the Prevention of Corruption (Amendment) Act, 2018 (Section 9), under what conditions is a commercial organization held criminally liable for bribery?',
      options: [
        'If an associated person offers an undue advantage to a public servant to obtain or retain business, unless the organization proves it had adequate compliance procedures in place',
        'Only if the bribe exceeded 1 million dollars in physical cash',
        'Only if corporate board members personally signed a written bribery contract',
        'Commercial corporations are exempt from criminal anti-corruption prosecution'
      ],
      correctAnswer: 0,
      explanation: 'Section 9 introduces corporate criminal liability for bribes paid by employees or agents, modeled on the UK Bribery Act. The only statutory defense is proving robust compliance controls were active.',
      difficulty: 'hard'
    },
    {
      id: 'law-12',
      category: 'cloud_devops',
      categoryName: 'Cross-Border Data Transfers & Sovereignty',
      question: 'Under modern international data transfer mechanisms (EU GDPR Chapter V / Indian DPDP Act), what is the legal purpose of Standard Contractual Clauses (SCCs)?',
      options: [
        'Pre-approved contractual commitments ensuring data exporters and foreign importers provide essentially equivalent data protection safeguards when transferring personal data across borders',
        'A billing contract for trans-Atlantic subsea fiber optic bandwidth',
        'A waiver allowing foreign governments to inspect all private databases without warrants',
        'A software licensing agreement for database hosting servers'
      ],
      correctAnswer: 0,
      explanation: 'SCCs are standardized legal terms binding foreign data recipients to uphold stringent privacy, security, audit, and data subject rights when personal data leaves sovereign jurisdictions.',
      difficulty: 'hard'
    },
    {
      id: 'law-13',
      category: 'fundamentals',
      categoryName: 'Labor Law & Industrial Relations Code',
      question: 'Under the Industrial Relations Code, 2020, what is the mandatory notice period requirement before employees or trade unions can initiate a lawful strike in an industrial establishment?',
      options: [
        'At least 14 days notice, given within 60 days before striking, and strictly prohibiting strikes while conciliation proceedings are pending',
        'No notice is required; wildcat walkouts are permitted at any time',
        '10 years written advance notice to the state governor',
        'Notice is only required if the factory produces defense munitions'
      ],
      correctAnswer: 0,
      explanation: 'The new labor codes mandate a minimum 14-day advance notice for strikes across all industrial establishments (expanding the prior public utility rule) to foster conciliation arbitration.',
      difficulty: 'easy'
    },
    {
      id: 'law-14',
      category: 'backend_systems',
      categoryName: 'Intellectual Property Licensing & FRAND Terms',
      question: 'In technology standard-setting organizations (SSOs, e.g. 3GPP, IEEE), what legal obligation do holders of Standard Essential Patents (SEPs) assume under FRAND commitments?',
      options: [
        'Covenant to license essential patents on Fair, Reasonable, and Non-Discriminatory (FRAND) terms without anti-competitive hold-up or discriminatory royalty exclusion',
        'Mandate to release all patents into the public domain for free without compensation',
        'Obligation to sell company shares to competitors upon request',
        'Prohibition against filing patent infringement lawsuits in any court'
      ],
      correctAnswer: 0,
      explanation: 'FRAND commitments prevent patent holdup by requiring SEP owners to license essential technological building blocks on fair, proportional terms to any implementer of the standard.',
      difficulty: 'medium'
    },
    {
      id: 'law-15',
      category: 'cloud_devops',
      categoryName: 'Whistleblower Protection & Audit Committees',
      question: 'Under Section 177(9) of the Companies Act, 2013 and SEBI Listing Regulations, what is the statutory role of the Vigil Mechanism (Whistleblower Policy) in listed companies?',
      options: [
        'Provides safe channel for directors and employees to report genuine concerns of unethical behavior or legal violations, guaranteeing adequate safeguards against victimization and direct access to Audit Committee Chairman',
        'Enables anonymous social media smear campaigns against corporate rivals',
        'Authorizes human resources to monitor private home telephone lines of workers',
        'Requires all employee complaints to be dismissed without investigation'
      ],
      correctAnswer: 0,
      explanation: 'The Vigil Mechanism ensures an institutional grievance reporting conduit with non-retaliation protections and direct escalation pathways to the independent Audit Committee for severe malfeasance.',
      difficulty: 'easy'
    }
  ],

  // 11. UI/UX & Digital Product Designer
  'UI/UX & Digital Product Designer': [
    {
      id: 'des-1',
      category: 'frontend_web',
      categoryName: 'Design Systems & Ergonomics',
      question: 'In human-computer interaction (HCI) and design systems, how does Fitts\'s Law dictate the ergonomic placement of primary call-to-action (CTA) buttons?',
      options: [
        'The time to acquire a target is a function of the distance to and width of the target; larger targets closer to the user\'s pointer/thumb minimize interaction friction',
        'Buttons should be hidden behind dropdown submenus to maintain visual minimalism',
        'All interactive touch targets must be under 12 physical pixels on mobile devices',
        'Button colors must always blend invisibly with page backgrounds'
      ],
      correctAnswer: 0,
      explanation: 'Fitts\'s Law models human movement time: target size and proximity directly reduce motor effort and cognitive load in interactive layouts.',
      difficulty: 'medium'
    },
    {
      id: 'des-2',
      category: 'fundamentals',
      categoryName: 'WCAG Accessibility Standards',
      question: 'Under WCAG 2.1 Level AA accessibility standards, what is the minimum required color contrast ratio for normal body text against its background?',
      options: [
        '4.5:1 for normal text (and 3:1 for large text 18pt+)',
        '1:1 for all text elements',
        '12:1 regardless of font size',
        'No contrast ratio is required if fonts use sans-serif typefaces'
      ],
      correctAnswer: 0,
      explanation: 'WCAG 2.1 AA mandates at least 4.5:1 contrast for normal text to ensure readability for users with low vision or color perception impairments.',
      difficulty: 'easy'
    },
    {
      id: 'des-3',
      category: 'frontend_web',
      categoryName: 'Cognitive Load & Hick\'s Law',
      question: 'How does Hick\'s Law guide user interface simplification during complex checkout or registration onboarding flows?',
      options: [
        'The time required to make a decision increases logarithmically with the number and complexity of choices; dividing long forms into progressive disclosure steps reduces decision paralysis',
        'Users can process an infinite number of choices simultaneously without cognitive fatigue',
        'Forms should display 50 questions on a single screen without pagination',
        'All dropdowns must contain at least 100 choices'
      ],
      correctAnswer: 0,
      explanation: 'Hick\'s Law posits T = b * log2(n + 1). Breaking overwhelming forms into progressive disclosure chunks minimizes cognitive burden and churn.',
      difficulty: 'medium'
    },
    {
      id: 'des-4',
      category: 'frontend_web',
      categoryName: 'Design Tokens & Multi-Brand Themes',
      question: 'In enterprise Figma design systems and style dictionaries, what is the architectural role of "Design Tokens" (e.g. color-primary-500, spacing-md)?',
      options: [
        'Platform-agnostic semantic key-value variables that serve as the single source of truth connecting design mockups with React/Tailwind/Flutter codebases',
        'Cryptocurrency tokens rewarded to designers per Figma frame created',
        'Security certificates for web hosting',
        'File format converters for 3D printing'
      ],
      correctAnswer: 0,
      explanation: 'Design tokens encapsulate visual design attributes (spacing, typography, color, elevation) into systematic variables that sync seamlessly between design tools and production frontend code.',
      difficulty: 'easy'
    },
    {
      id: 'des-5',
      category: 'fundamentals',
      categoryName: 'Heuristic Evaluation (Jakob Nielsen)',
      question: 'According to Jakob Nielsen\'s 10 Usability Heuristics, what is meant by "Visibility of System Status"?',
      options: [
        'The design should always keep users informed about what is going on through appropriate feedback (e.g. loaders, progress bars, toasts) within reasonable time',
        'The website must publish its monthly corporate tax balance sheet',
        'All source code must be public open source',
        'The user\'s webcam must remain turned on during browsing'
      ],
      correctAnswer: 0,
      explanation: 'Users feel confident when systems provide immediate, clear feedback (spinners, step progress indicators, toast messages) communicating the current state of asynchronous operations.',
      difficulty: 'easy'
    },
    {
      id: 'des-6',
      category: 'frontend_web',
      categoryName: 'Mobile Ergonomics & Thumb Zone',
      question: 'In Steven Hoober\'s mobile ergonomics research, why are primary navigation elements and search bars increasingly placed in the bottom 30% of smartphone screens?',
      options: [
        'It maps directly into the "Natural Thumb Zone" for single-handed smartphone interaction, avoiding painful reach to top corners on large displays',
        'Smartphones emit less blue light from the bottom of screens',
        'Mobile operating systems disable touch sensors in top corners',
        'Battery cells are located at the top of phones'
      ],
      correctAnswer: 0,
      explanation: 'Over 75% of mobile users rely on one thumb. Bottom navigation bars and sheets place high-frequency taps directly within effortless thumb reach.',
      difficulty: 'medium'
    },
    {
      id: 'des-7',
      category: 'frontend_web',
      categoryName: 'Responsive Typography & Fluid Layout',
      question: 'In modern CSS design systems, what is the layout benefit of using `clamp(1rem, 2.5vw, 2.25rem)` for fluid typography over hardcoded breakpoint media queries?',
      options: [
        'Smoothly scales font size linearly between minimum and maximum bounds based on viewport width without abrupt, jarring font jumps at fixed breakpoints',
        'Encrypts CSS font files on the CDN',
        'Allows users to download font files for free',
        'Prevents emojis from rendering on mobile screens'
      ],
      correctAnswer: 0,
      explanation: 'CSS clamp(min, val, max) produces proportional fluid typography that scales harmoniously across all screen resolutions without requiring numerous `@media` rules.',
      difficulty: 'medium'
    },
    {
      id: 'des-8',
      category: 'fundamentals',
      categoryName: 'Visual Trends & Skeuomorphism',
      question: 'In modern UI aesthetics, what defines "Glassmorphism" styling compared to Flat Design and Neumorphism?',
      options: [
        'Multi-layered translucent elements featuring CSS backdrop-filter blur, subtle white semi-transparent borders, and vivid floating background gradients that convey spatial depth',
        'Solid 100% black buttons with zero border radius',
        'Extruded soft shadows that make UI elements look like clay push-buttons',
        'Photorealistic wooden leather texture skeuomorphism'
      ],
      correctAnswer: 0,
      explanation: 'Glassmorphism relies on background blur (`backdrop-filter: blur()`), multi-plane visual hierarchy, and delicate translucent borders to evoke frosted glass floating over colorful backdrops.',
      difficulty: 'easy'
    },
    {
      id: 'des-9',
      category: 'frontend_web',
      categoryName: 'Gestalt Principles of Visual Perception',
      question: 'In interface layout composition, how does the Gestalt "Law of Proximity" influence how users process grouped information cards?',
      options: [
        'Objects placed close to each other are perceived by the human visual cortex as belonging together in a single conceptual group or relationship',
        'All UI elements must be spaced exactly 100 pixels apart regardless of context',
        'Text labels should always be placed on opposite sides of the viewport from their icons',
        'Users only read content rendered inside circles'
      ],
      correctAnswer: 0,
      explanation: 'The Law of Proximity states that spatial distance dictates visual grouping. Related items grouped closely need minimal container borders to be perceived as unified entities.',
      difficulty: 'easy'
    },
    {
      id: 'des-10',
      category: 'fundamentals',
      categoryName: 'Usability Testing & SUS Score',
      question: 'In quantitative UX benchmarking, what is the System Usability Scale (SUS) and what numerical score is widely recognized as the industry average benchmark?',
      options: [
        'A standardized 10-item Likert questionnaire measuring usability and learnability, where a score of 68 is the recognized baseline average (above 80 is Grade A excellence)',
        'A benchmark measuring CPU temperature during user clicks',
        'A scale measuring how many lines of CSS code were written',
        'A score calculating marketing advertising spend'
      ],
      correctAnswer: 0,
      explanation: 'Created by John Brooke, SUS yields a 0–100 composite score. Extensive research benchmarks 68 as the global normative average for product usability.',
      difficulty: 'medium'
    },
    {
      id: 'des-11',
      category: 'frontend_web',
      categoryName: 'Micro-Interactions & Animation Choreography',
      question: 'In interactive motion design, why are cubic-bezier easing curves (e.g. `cubic-bezier(0.4, 0, 0.2, 1)`) preferred over linear animations for sliding dialogs and drawers?',
      options: [
        'Natural physical objects accelerate and decelerate due to inertia and friction; ease-out / ease-in-out curves mimic real-world physics, making transitions feel organic rather than robotic',
        'Linear animations consume 90% more GPU memory',
        'Cubic-bezier curves encrypt the webpage DOM tree',
        'Web browsers cannot render linear animations on mobile phones'
      ],
      correctAnswer: 0,
      explanation: 'Linear transitions feel unnatural and harsh because real-world physics always exhibits momentum. Easing curves provide smooth entrance deceleration and exit acceleration.',
      difficulty: 'easy'
    },
    {
      id: 'des-12',
      category: 'backend_systems',
      categoryName: 'User Journey Mapping & Service Blueprints',
      question: 'In service design methodology, how does a Service Blueprint expand upon an end-user Journey Map?',
      options: [
        'By diagramming both frontstage customer touchpoints and backstage internal employee processes, digital support systems, and organizational workflows required to deliver the customer experience',
        'By writing SQL queries for customer support databases',
        'By creating 3D architectural floorplans for corporate offices',
        'By listing company executive salaries'
      ],
      correctAnswer: 0,
      explanation: 'While customer journey maps focus on user sentiment and touchpoints, service blueprints map the underlying backstage systems, policies, and staff actions that enable each touchpoint.',
      difficulty: 'medium'
    },
    {
      id: 'des-13',
      category: 'frontend_web',
      categoryName: 'Information Architecture & Card Sorting',
      question: 'What is the operational distinction between "Open Card Sorting" and "Closed Card Sorting" in website navigation taxonomy design?',
      options: [
        'In Open Sorting, participants group content topics and create their own category names; in Closed Sorting, participants sort topics into pre-defined established category buckets',
        'Open Sorting is done with physical paper; Closed Sorting is done with closed eyes',
        'Closed Sorting is restricted to enterprise employees only',
        'Open Sorting automatically writes React code components'
      ],
      correctAnswer: 0,
      explanation: 'Open card sorting reveals mental models and exploratory vocabulary, whereas closed card sorting validates whether an existing taxonomy structure makes intuitive sense to users.',
      difficulty: 'easy'
    },
    {
      id: 'des-14',
      category: 'fundamentals',
      categoryName: 'Accessible Forms & Error State Ergonomics',
      question: 'When designing accessible error recovery states in web forms conforming to WCAG 3.3.1 / 3.3.3, why must visual color cues (e.g. red input border) always be accompanied by descriptive inline text and ARIA attributes?',
      options: [
        'Color alone is imperceptible to color-blind users and screen readers; explicit text explanations with `aria-describedby` and `aria-invalid="true"` clearly convey what went wrong and how to fix it',
        'To increase server response times',
        'Because red borders are blocked by modern ad blockers',
        'To prevent users from submitting forms using keyboards'
      ],
      correctAnswer: 0,
      explanation: 'WCAG prohibits relying solely on color to convey state. Pairing visual indicators with accessible inline text instructions and ARIA descriptors ensures universal perception.',
      difficulty: 'medium'
    },
    {
      id: 'des-15',
      category: 'cloud_devops',
      categoryName: 'A/B Testing & Statistical Significance',
      question: 'In digital product experimentation, why must an A/B test run until reaching minimum sample size and 95% statistical confidence (p < 0.05) before implementing a winning UI variant?',
      options: [
        'To prevent the "Peeking Problem" and false positives (Type I errors) driven by day-of-week seasonality, external marketing traffic spikes, or random variance',
        'Because web browsers automatically cache previous button colors for 30 days',
        'To ensure the database server has processed at least 1 Terabyte of data',
        'Because A/B testing platforms charge money if tests finish in under 48 hours'
      ],
      correctAnswer: 0,
      explanation: 'Prematurely declaring winners before achieving calculated sample size and p < 0.05 risks implementing UI changes that only appeared effective due to transient statistical noise.',
      difficulty: 'hard'
    }
  ]
};

export function getAssessmentQuestionsForRole(targetRole?: string): AssessmentQuestion[] {
  if (!targetRole) {
    return ROLE_ASSESSMENT_POOLS['Full Stack Cloud Engineer'];
  }

  // Find matching role pool
  const normalized = targetRole.trim();
  if (ROLE_ASSESSMENT_POOLS[normalized]) {
    return ROLE_ASSESSMENT_POOLS[normalized];
  }

  // Fuzzy match
  const key = Object.keys(ROLE_ASSESSMENT_POOLS).find(k => 
    normalized.toLowerCase().includes(k.toLowerCase()) || 
    k.toLowerCase().includes(normalized.toLowerCase())
  );

  if (key && ROLE_ASSESSMENT_POOLS[key]) {
    return ROLE_ASSESSMENT_POOLS[key];
  }

  return ROLE_ASSESSMENT_POOLS['Full Stack Cloud Engineer'];
}
