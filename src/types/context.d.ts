declare global {
  declare interface IEdiTDorContext {
    // offlineTD: Saving or displaying the TD as JSON For storage, sharing, or exporting Primary source of truth for the TD
    offlineTD: string;
    isValidJSON: boolean;
    // ParsedTD: Accessing and modifying TD properties 	For programmatic manipulation JavaScript object Derived from offlineTD
    parsedTD: IThingDescription;
    isModified: boolean;
    name: string;
    fileHandle: string | null;
    linkedTd: Record<string, any> | undefined;
    validationMessage: IValidationMessage;

    northboundConnection: INorthboundConnection;
    contributeCatalog: IContributeCatalog;
    settings: SettingsData;

    // Callback functions
    updateOfflineTD: (td: string) => void;
    updateIsModified: (isModified: boolean) => void;
    setFileHandle: (handle: string | null) => void;
    removeForm: (
      level: string,
      interactionName: string,
      toBeDeletedForm: { href: string; op: string },
      index: number
    ) => void;
    addForm: (
      level: "thing" | "properties" | "actions" | "events" | string,
      interactionName: string,
      form: any
    ) => void;
    removeLink: (link: any) => void;
    removeOneOfAKindReducer: (kind: string, oneOfAKind: string) => void;
    addLinkedTd: (linkedTd: Record<string, any>) => void;
    updateLinkedTd: (linkedTd: Record<string, any>) => void;
    updateValidationMessage: (validationMessage: IValidationMessage) => void;
    updateNorthboundConnection: (
      northboundConnection: INorthboundConnection
    ) => void;
    updateContributeCatalog: (contributeCatalog: IContributeCatalog) => void;
  }

  interface IValidationMessage {
    report: {
      json: null | "passed" | "failed" | "warning";
      schema: null | "passed" | "failed" | "warning";
      defaults: null | "passed" | "failed" | "warning";
      jsonld: null | "passed" | "failed" | "warning";
      additional: null | "passed" | "failed" | "warning";
    };
    details: {
      enumConst: null | string;
      propItems: null | string;
      security: null | string;
      propUniqueness: null | string;
      multiLangConsistency: null | string;
      linksRelTypeCount: null | string;
      readWriteOnly: null | string;
      uriVariableSecurity: null | string;
    };
    detailComments: {
      enumConst: null | string;
      propItems: null | string;
      security: null | string;
      propUniqueness: null | string;
      multiLangConsistency: null | string;
      linksRelTypeCount: null | string;
      readWriteOnly: null | string;
      uriVariableSecurity: null | string;
    };
    validationErrors?: {
      json: string;
      schema: string;
    };
    customMessage: string; // custom to editor
  }

  interface INorthboundConnection {
    message: string;
    northboundTd: ThingDescription | {};
  }

  interface IContributeCatalog {
    model: string;
    author: string;
    manufacturer: string;
    license: string;
    copyrightYear: string;
    holder: string;
    tmCatalogEndpoint: string;
    nameRepository: string;
    dynamicValues: Record<string, string>;
  }

  type EditorState = Omit<
    IEdiTDorContext,
    | "updateOfflineTD"
    | "updateIsModified"
    | "setFileHandle"
    | "removeForm"
    | "addForm"
    | "removeLink"
    | "removeOneOfAKindReducer"
    | "addLinkedTd"
    | "updateLinkedTd"
    | "updateValidationMessage"
    | "updateNorthboundConnection"
    | "updateContributeCatalog"
  >;

  type Action =
    | { type: "UPDATE_OFFLINE_TD"; offlineTD: string }
    | { type: "UPDATE_IS_MODIFIED"; isModified: boolean }
    | { type: "SET_FILE_HANDLE"; fileHandle: any }
    | {
        type: "REMOVE_FORM_FROM_TD";
        level: "thing" | "properties" | "actions" | "events" | string;
        interactionName: string;
        toBeDeletedForm: any;
        index: number;
      }
    | { type: "REMOVE_LINK_FROM_TD"; link: any }
    | {
        type: "REMOVE_ONE_OF_A_KIND_FROM_TD";
        kind: "thing" | "properties" | "actions" | "events" | string;
        oneOfAKindName: string;
      }
    | {
        type: "ADD_FORM_TO_TD";
        level: "thing" | "properties" | "actions" | "events" | string;
        interactionName: string;
        form: any;
      }
    | { type: "ADD_LINKED_TD"; linkedTd: any }
    | { type: "UPDATE_LINKED_TD"; linkedTd: any }
    | { type: "UPDATE_VALIDATION_MESSAGE"; validationMessage: any }
    | {
        type: "UPDATE_NORTHBOUND_CONNECTION";
        northboundConnection: INorthboundConnection;
      }
    | {
        type: "UPDATE_CONTRIBUTE_CATALOG";
        contributeCatalog: IContributeCatalog;
      }
    | { type: "UPDATE_SETTINGS"; settings: SettingsData };

  declare type Validation = "VALID" | "INVALID" | "VALIDATING" | null;
  declare type ActiveSection =
    | "INSTANCE"
    | "GATEWAY"
    | "TABLE"
    | "SAVING_RESULTS";
  interface SectionError {
    error: boolean;
    message: string;
  }
  interface SettingsData {
    northboundUrl: string;
    southboundUrl: string;
    pathToValue: string;
    jsonIndentation: 2 | 4;
  }

  // Define the shape of the state
  declare interface ContributionToCatalogState {
    workflow: {
      currentStep: number;
      showDialog: boolean;
      backgroundTdToSend: ThingDescription;
    };
    metadata: {
      model: string;
      author: string;
      manufacturer: string;
      license: string;
      copyrightYear: string;
      holder: string;
      copied: boolean;
      validation: Validation;
      errorMessage: string;
    };
    interaction: {
      activeSection: ActiveSection;
      sectionErrors: {
        instance: SectionError;
        gateway: SectionError;
        table: SectionError;
        results: SectionError;
      };
      isTestingAll: boolean;
      settingsData: SettingsData;
      placeholderValues: Record<string, string>;
      propertyResponseMap: Record<string, { value: string; error: string }>;
    };
    submission: {
      tmCatalogEndpoint: string;
      tmCatalogEndpointError: string;
      repository: string;
      repositoryError: string;
      submitted: boolean;
      submittedError: string;
      id: string;
      link: string;
    };
  }
}
export {};
