import chalk from 'chalk';

import { Channel } from '/db/models';

export class APIError extends Error {
  constructor(statusCode, message) {
    super(message);

    this.statusCode = statusCode;
  }
}

export function debug(message, data = null) {
  if (process.env.DEBUG) {
    console.log(`${chalk.red('DEBUG')}: ${message}`);
    if (data) console.log(JSON.stringify(data, null, 2));
  }
}

export function buildHttpResponse({ statusCode = 200, status = 'Success', ...data }) {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true
    },
    body: JSON.stringify({ status, ...data })
  };
}

export function buildHttpError(err) {
  let { statusCode = 500, message: status } = err;

  if (statusCode === 200 && !status) status = 'Success';

  console.error(`Error: ${statusCode} ${status}`);
  return buildHttpResponse({ statusCode, status });
}

// Looks for strings that are numbers in a nested object and converts them to numbers
export function parseAllInts(data) {
  Object.keys(data).forEach((key) => {
    let value = data[key];

    if (typeof value === 'object') {
      value = parseAllInts(value);
    }

    if (typeof value === 'string' && !Number.isNaN(Number(value))) {
      value = parseInt(value, 10);
    }

    data[key] = value;
  });

  return data;
}

// Turn an array into an lookup object by a specific property as a lookup table
export function buildLookupTable({ from, by, copy = [], include = [] }) {
  return from.reduce((acc, item) => {
    let values = {};

    // Copy some fields (e.g. turn id into videoId)
    copy.forEach(([fromField, toField]) => {
      item[toField] = item[fromField];
    });

    // Sometimes you don't want all of the data from the original array
    if (Array.isArray(include) && include.length) {
      include.forEach((property) => (values[property] = item[property]));
    } else if (typeof include === 'string') {
      values = item[include];
    } else {
      values = item;
    }

    return {
      ...acc,
      [item[by]]: values
    };
  }, {});
}

// Wrapper function to... get channels!
export async function getChannels() {
  return Channel.find({});
}
