process.env.NODE_ENV = "test";
process.env.JWT_SECRET ??= "test-secret-at-least-16-chars";
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgres://hexon:hexon@localhost:5432/hexon_locations_test";
