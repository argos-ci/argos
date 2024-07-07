export type BuildMetadata = {
  testReport?: {
    status: "passed" | "failed" | "timedout" | "interrupted";
    stats?: {
      startTime?: string;
      duration?: number;
      tests?: number;
      expected?: number;
      unexpected?: number;
    };
  };
  automationLibrary: {
    name: string;
    version: string;
  };
  sdk: {
    name: string;
    version: string;
  };
};

export const BuildMetadataJsonSchema = {
  type: ["object", "null"],
  required: ["sdk", "automationLibrary"],
  additionalProperties: false,
  properties: {
    testReport: {
      oneOf: [
        {
          type: "object",
          additionalProperties: false,
          required: ["status"],
          properties: {
            status: {
              type: "string",
              enum: ["passed", "failed", "timedout", "interrupted"],
            },
            stats: {
              type: "object",
              additionalProperties: false,
              properties: {
                startTime: {
                  type: "string",
                },
                duration: {
                  type: "number",
                },
                tests: {
                  type: "integer",
                },
                expected: {
                  type: "integer",
                },
                unexpected: {
                  type: "integer",
                },
              },
            },
          },
        },
        { type: "null" },
      ],
    },
    automationLibrary: {
      type: "object",
      required: ["name", "version"],
      additionalProperties: false,
      properties: {
        name: {
          type: "string",
        },
        version: {
          type: "string",
        },
      },
    },
    sdk: {
      type: "object",
      required: ["name", "version"],
      additionalProperties: false,
      properties: {
        name: {
          type: "string",
        },
        version: {
          type: "string",
        },
      },
    },
  },
};
