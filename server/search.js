import pluralize from 'pluralize';
import aqp from 'api-query-params';

import dbConnect from '/db/db/';

import { buildHttpResponse, buildHttpError } from '/lib/util';

import { MAX_API_SEARCH_LIMIT } from '/config';

// Wrapper function for a GET API endpoint for channels, videos that handles search
export async function searchModelAPI({ model, event: { queryStringParameters } }) {
  let response = {};

  try {
    await dbConnect();

    // Querystring needs to be converted into a format that api-query-params can handle
    const queryStringData = queryStringParameters
      ? Object.entries(queryStringParameters)
          .map(([param, value]) => {
            return `${encodeURIComponent(param)}${value && `=${encodeURIComponent(value)}`}`;
          })
          .join('&')
      : {};
    let { filter, skip, limit = 10, sort, projection, population } = aqp(queryStringData);

    // sensible defaults
    if (limit > MAX_API_SEARCH_LIMIT) {
      limit = MAX_API_SEARCH_LIMIT;
      response.notice = `Max result size hit. Only returning first ${MAX_API_SEARCH_LIMIT} matches (use skip parameter to paginate).`;
    }
    if (!sort) {
      sort = { pubDate: -1 };
    }

    const result = await model
      .find(filter)
      .skip(skip)
      .limit(limit)
      .sort(sort)
      .select(projection)
      .populate(population)
      .exec();

    // Let's go nuts and hit the database again!
    response = {
      ...response,
      totalCount: await model.countDocuments({}),
      matchingCount: await model.countDocuments(filter),
      ...(skip && { skip }),
      ...(limit && { limit })
    };

    if (result?.length) {
      response[pluralize(model.modelName).toLowerCase()] = result;
    } else {
      response = {
        ...response,
        statusCode: 404,
        status: 'No results found for the specified criteria'
      };
    }

    return buildHttpResponse(response);
  } catch (err) {
    return buildHttpError(err);
  }
}
