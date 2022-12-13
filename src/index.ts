import * as core from "@actions/core";
import { readConfig } from "./config";
import { apiClient } from "./client/apiClient";
import { isSuccessful } from "./run/status";
import { startRun } from "./run/start";
import { FinishedRun, waitForRunEnd } from "./run/ongoing";
import { formatErrorMessage } from "./utils/error";

async function run(): Promise<void> {
  try {
    const config = readConfig();
    const client = apiClient(config.api);

    await client.checkCloudCompatibility();

    const startedRun = await startRun(client, config);
    core.setOutput("run_id", startedRun.runId);
    core.setOutput("reports_url", startedRun.reportsUrl);
    core.setOutput("runs_url", startedRun.runsUrl);

    const finishedRun = await waitForRunEnd(client, startedRun);
    logResult(finishedRun);

    // TODO RND-7 Metrics summary and XML report

    core.setOutput("runs_status_code", finishedRun.statusCode);
    core.setOutput("runs_status_name", finishedRun.statusName);
    core.setOutput("run_assertions", finishedRun.assertions);
  } catch (error) {
    core.setFailed(formatErrorMessage(error));
  }
}

const logResult = (finishedRun: FinishedRun) => {
  if (isSuccessful(finishedRun.statusCode)) {
    core.info(`Run ${finishedRun.runId} finished with status ${finishedRun.statusName}`);
  } else {
    core.setFailed(`Run ${finishedRun.runId} failed with status ${finishedRun.statusName}`);
  }

  for (const assertion of finishedRun.assertions) {
    if (assertion.result) {
      core.info(`${assertion.message} succeeded with value ${assertion.actualValue}`);
    } else {
      core.error(`${assertion.message} failed with value ${assertion.actualValue}`);
    }
  }
};

run();
