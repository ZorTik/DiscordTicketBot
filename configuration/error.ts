import {Configuration, YamlConfiguration} from "./index";

export class ConfigurationError extends Error {
    private readonly configuration: Configuration;
    public constructor(configuration: Configuration, message?: string) {
        super(message);
        this.configuration = configuration;
    }
    getConfiguration(): Configuration {
        return this.configuration;
    }
}
export class YamlDocumentNotLoadedError extends ConfigurationError {
    public constructor(configuration: YamlConfiguration,
                       message: string = "Yaml document is not loaded in " + configuration.getPath()) {
        super(configuration, message);
    }
    getConfiguration(): YamlConfiguration {
        return <YamlConfiguration>super.getConfiguration();
    }
}