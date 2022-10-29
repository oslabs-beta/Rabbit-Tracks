const db = require("../models/elephantsql");
import { runConsume } from "../../rabbitmq/consume";

import { Messages, MessageController } from "../../types";

import express, {
  Request,
  Response,
  NextFunction,
  RequestHandler,
} from "express";

const messageController: MessageController = {};

messageController.getAllMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.log("Getting all messages...");

  const projectId: number = req.body.project_id;

  const queryString: string = `SELECT * FROM messages WHERE project_id = ${projectId}`;

  if (projectId) {
    await db
      .query(queryString)
      .then((data: Array<Messages>) => {
        res.locals.messages = data[0];
        console.log("Successfully got all messages.");
        return next();
      })
      .catch((err: Error) => {
        return next({
          log: `Error in messageController.getAllMessages... Query from database unsuccessful: ${JSON.stringify(
            err
          )}`,
          status: 500,
          message: "Query from database unsuccessful.",
        });
      });
  } else {
    return next({
      log: "Error in messageController.getAllMessages... Did not receive projectId in getAllMessages request.",
      status: 500,
      message: "Did not receive projectId in getAllMessages request.",
    });
  }
};

messageController.addMessage = async (req, res, next) => {
  console.log("Adding message to database...");
  let columnText: string = "";
  let valuesText: string = "";
  let headers: string;
  const columns: Array<string> = Object.keys(req.body);
  for (let i = 0; i < columns.length; i++) {
    // set aside headers for now, we'll need to come back and add info from headers into deaths table
    if (columns[i] === "headers") {
      headers = req.body[columns[i]];
    }
    // for any properties that aren't undefined, add them to the query text
    else if (columns[i] !== undefined) {
      if (columnText.length > 0) {
        columnText += ", ";
        valuesText += ", ";
      }
      columnText += columns[i] === "projectId" ? `project_id` : `${columns[i]}`;
      valuesText += `'${req.body[columns[i]]}'`;
    }
  }

  const queryString: string = `INSERT INTO messages (${columnText}) VALUES (${valuesText}) RETURNING *`;

  await db
    .query(queryString)
    .then((data: Array<Array<Messages>>) => {
      res.locals.message = data[0][0];
      console.log("Successfully added message to database.");
      return next();
    })
    .catch((err: Error) => {
      return next({
        log: `Error in messageController.addMessage... Unable to add message to database: ${JSON.stringify(
          err
        )}`,
        status: 500,
        message: "Unable to add message to database.",
      });
    });
};

messageController.runConsume = async (req, res, next) => {

  const projectID: number = req.body.projectID;

  const queryString: string = `SELECT project_url FROM projects WHERE project_id = ${projectID}`;

  if (projectID) {
    await db
      .query(queryString)
      .then((data: Array<any>) => {
        const URL = data[0][0]['project_url'];
        console.log('project_url: ', data[0][0]['project_url']);
        runConsume(URL, projectID);
        return next();
      })
      .catch((err: Error) => {
        return next({
          log: `Error in messageController.runConsume... Query from database unsuccessful: ${JSON.stringify(
            err
          )}`,
          status: 500,
          message: "Query from database unsuccessful.",
        });
      });
  } else {
    return next({
      log: "Error in messageController.runConsume... Did not receive projectId in runConsume request.",
      status: 500,
      message: "Did not receive projectId in runConsume request.",
    });
  }
}

module.exports = messageController;
