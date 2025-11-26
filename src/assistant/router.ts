import { Request, Response } from 'express';
import * as TrelloService from '../services/trello';

type ToolsSpec = {
  components?: {
    ['x-oai-tools']?: Array<{
      function?: {
        name?: string;
      };
    }>;
  };
};

function loadToolsDefinition(): ToolsSpec {
  try {
    // Prioritize the compiled spec copied to dist/
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('../../dist/tools.json');
  } catch (distError) {
    console.warn(
      '[tools.json] dist/tools.json introuvable, utilisation de la version racine (mode dev).'
    );
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('../../tools.json');
  }
}

const toolsSpec: ToolsSpec = loadToolsDefinition();

function extractToolNames(): string[] {
  const tools = toolsSpec.components?.['x-oai-tools'];
  if (!Array.isArray(tools)) {
    return [];
  }

  return tools
    .map((tool) => tool?.function?.name)
    .filter((name): name is string => typeof name === 'string' && name.trim().length > 0);
}

export async function dynamicToolRouter(req: Request, res: Response) {
  try {
    const { action, ...params } = req.body || {};

    if (!action || typeof action !== 'string') {
      return res.status(400).json({
        error: "Missing 'action' field in request body.",
      });
    }

    const declaredTools = extractToolNames();

    if (!declaredTools.includes(action)) {
      return res.status(400).json({
        error: `UnrecognizedFunctionError: '${action}' is not listed in tools.json`,
        declared_tools: declaredTools,
      });
    }

    const handler = (TrelloService as Record<string, unknown>)[action];

    if (typeof handler !== 'function') {
      return res.status(500).json({
        error: `BackendMissingImplementation: '${action}' is declared in tools.json but not implemented in TrelloService.`,
      });
    }

    const result = await (handler as (params: Record<string, any>) => Promise<unknown>)(params);

    return res.json({
      ok: true,
      data: result,
    });
  } catch (err: any) {
    console.error('❌ Error inside dynamic router:', err);
    return res.status(500).json({
      error: 'InternalServerError',
      message: err?.message || 'Unknown error',
    });
  }
}


