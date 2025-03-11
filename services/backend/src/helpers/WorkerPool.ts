import { URL } from "url";
import { Worker } from "worker_threads";
import os from "os";

interface Task {
  taskData: any;
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}

interface ExtendedWorker extends Worker {
  currentTaskResolve?: (value: any) => void;
  currentTaskReject?: (reason?: any) => void;
}

export class WorkerPool {
  workerFile: string | URL;
  workers: ExtendedWorker[];
  idleWorkers: ExtendedWorker[];
  taskQueue: Task[];

  // Dynamic worker pool settings:
  minWorkers: number;
  maxWorkers: number;
  monitorIntervalMs: number;
  monitorInterval?: NodeJS.Timeout;

  constructor(
    workerFile: string | URL,
    minWorkers: number,
    maxWorkers: number,
    monitorIntervalMs = 5000
  ) {
    this.workerFile = workerFile;
    this.minWorkers = minWorkers;
    this.maxWorkers = maxWorkers;
    this.monitorIntervalMs = monitorIntervalMs;
    this.workers = [];
    this.idleWorkers = [];
    this.taskQueue = [];

    // Create initial (min) workers
    for (let i = 0; i < this.minWorkers; i++) {
      this._addWorker();
    }

    // Start system load monitoring for dynamic scaling.
    this.monitorInterval = setInterval(
      () => this._adjustWorkers(),
      this.monitorIntervalMs
    );
  }

  private _createWorker(): ExtendedWorker {
    const worker = new Worker(this.workerFile) as ExtendedWorker;
    worker.on("message", (msg) => {
      if (worker.currentTaskResolve) {
        worker.currentTaskResolve(msg);
      }
      worker.currentTaskResolve = undefined;
      worker.currentTaskReject = undefined;
      this.idleWorkers.push(worker);
      this._processQueue();
    });
    worker.on("error", (err) => {
      if (worker.currentTaskReject) {
        worker.currentTaskReject(err);
      }
      worker.currentTaskResolve = undefined;
      worker.currentTaskReject = undefined;
      // Replace the worker if it errors.
      this._replaceWorker(worker);
      this._processQueue();
    });
    return worker;
  }

  private _addWorker(): void {
    const worker = this._createWorker();
    this.workers.push(worker);
    this.idleWorkers.push(worker);
    console.log("Added worker. Total workers:", this.workers.length);
  }

  private _replaceWorker(oldWorker: ExtendedWorker): void {
    this.workers = this.workers.filter((w) => w !== oldWorker);
    this.idleWorkers = this.idleWorkers.filter((w) => w !== oldWorker);
    console.log("Replacing worker. Total workers:", this.workers.length);
    this._addWorker();
  }

  private _processQueue(): void {
    if (this.taskQueue.length > 0 && this.idleWorkers.length > 0) {
      const task = this.taskQueue.shift();
      if (task) {
        const worker = this.idleWorkers.shift();
        if (worker) {
          worker.currentTaskResolve = task.resolve;
          worker.currentTaskReject = task.reject;
          worker.postMessage(task.taskData);
        }
      }
    }
  }

  /**
   * Checks system load and adjusts the number of workers.
   * If the system is underloaded and there are queued tasks, add a worker (up to maxWorkers).
   * If the system is overloaded and an idle worker is available (and above minWorkers), terminate one.
   */
  private _adjustWorkers(): void {
    const loadAvg = os.loadavg()[0]; // 1-minute load average
    const freeMem = os.freemem();
    const totalMem = os.totalmem();
    const freeMemRatio = freeMem / totalMem;
    const cpuCount = os.cpus().length;

    console.log(
      "System Load:",
      loadAvg,
      "Free Memory Ratio:",
      freeMemRatio,
      "Cpu Count:",
      cpuCount
    );

    // Define thresholds (you can tune these values)
    const loadThreshold = cpuCount * 1.0; // e.g., if load is below the number of cores
    const freeMemThreshold = 0.2; // require at least 20% free memory

    console.log(
      `System Load: ${loadAvg.toFixed(
        2
      )}, Free Memory Ratio: ${freeMemRatio.toFixed(2)}, Workers: ${
        this.workers.length
      }, Queue: ${this.taskQueue.length}`
    );

    // If the system is underloaded and there are tasks waiting, add a worker if below maxWorkers.
    if (
      loadAvg < loadThreshold &&
      freeMemRatio > freeMemThreshold &&
      this.taskQueue.length > 0 &&
      this.workers.length < this.maxWorkers
    ) {
      console.log("System underloaded: adding a worker");
      this._addWorker();
    }

    // Determine if system is overloaded.
    const isOverloaded =
      loadAvg > loadThreshold * 1.2 || freeMemRatio < freeMemThreshold * 0.8;
    // Remove one idle worker if overloaded and we have more than the minimum workers.
    if (
      isOverloaded &&
      this.idleWorkers.length > 0 &&
      this.workers.length > this.minWorkers
    ) {
      const workerToRemove = this.idleWorkers.shift();
      if (workerToRemove) {
        console.log("System overloaded: terminating one idle worker");
        workerToRemove.terminate();
        this.workers = this.workers.filter((w) => w !== workerToRemove);
      }
    }
  }

  runTask(taskData: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.taskQueue.push({ taskData, resolve, reject });
      this._processQueue();
    });
  }

  async destroy(): Promise<void> {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }
    for (const worker of this.workers) {
      await worker.terminate();
    }
    this.workers = [];
    this.idleWorkers = [];
  }
}
