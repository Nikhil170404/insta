import { Redis as UpstashRedis } from "@upstash/redis";

export const Redis = UpstashRedis.fromEnv();
