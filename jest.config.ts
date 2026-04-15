import type { Config } from "jest"

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^next-auth$": "<rootDir>/src/__mocks__/next-auth.ts",
    "^next-auth/providers/credentials$": "<rootDir>/src/__mocks__/next-auth.ts"
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
      },
    ],
  },
  testMatch: ["**/__tests__/**/*.test.ts"],
  collectCoverageFrom: [
    "src/app/api/**/*.ts",
    "src/lib/**/*.ts",
    "!src/lib/prisma.ts",
    "!src/lib/auth.ts",
  ],
}

export default config
