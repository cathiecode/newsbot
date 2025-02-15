export interface KVS {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string): Promise<void>;
  getOrDefault(key: string, defaultValue: string): Promise<string>;
  getOrSetDefault(key: string, defaultValue: string): Promise<string>;
}

export abstract class BaseKVS implements KVS {
  abstract get(key: string): Promise<string | undefined>;
  abstract set(key: string, value: string): Promise<void>;

  async getOrDefault(key: string, defaultValue: string): Promise<string> {
    return await this.get(key) ?? defaultValue;
  }

  async getOrSetDefault(key: string, defaultValue: string): Promise<string> {
    const mayValue = await this.get(key);

    if (mayValue === undefined) {
      await this.set(key, defaultValue);
    }

    return defaultValue;
  }
}

export class DenoTextFileKVS extends BaseKVS implements KVS {
  override async get(key: string): Promise<string | undefined> {
    try {
      return await Deno.readTextFile(key);
    } catch (e) {
      console.error(e);
      return undefined;
    }
  }
  override async set(key: string, value: string): Promise<void> {
    return await Deno.writeTextFile(key, value);
  }
}

export class MemoryKVS extends BaseKVS implements KVS {
  private map = new Map<string, string>();

  // deno-lint-ignore require-await
  override async get(key: string): Promise<string | undefined> {
    return this.map.get(key);
  }
  // deno-lint-ignore require-await
  override async set(key: string, value: string): Promise<void> {
    this.map.set(key, value);
  }
}
