![alt text](https://github.com/eclipse-editdor/editdor/blob/master/logo/1585_ediTDor_logo.png "ediTDor logo")
[![Discord](https://img.shields.io/badge/Discord-7289DA?logo=discord&logoColor=white&label=WoT-CG-Discord)](https://discord.com/channels/1081253871688622181/1359286591100817549)

A tool for simply designing W3C Thing Descriptions and Thing Models

Find the ediTDor here to try it out:

https://eclipse-editdor.github.io/editdor/

## About this project

This project aims to make creating W3C Thing Description (TD) instances and Thing Model (TM) easy by providing a platform-independent ediTDor tool. The following features are addressed in this project:

- Creating a new Thing Description / Thing Model from scratch
- Rendering a Thing Description / Thing Model
- Editing the Thing Description / Thing Model
- Validating the Thing Description / Thing Model
- Exporting the Thing Description / Thing Model from the visual representation into JSON-LD
- Reading/writing exposed properties' values exposed by a proxy (anything that can translate a protocol to HTTP)
- Contributing the Thing Model to a third-party catalog using the Thing Model Catalog (TMC) API.
  The detailed **Thing Model Catalog (TMC) OpenAPI specification** is available
  [here](https://github.com/wot-oss/tmc/blob/main/api/tm-catalog.openapi.yaml).

## Technologies

- React
- TailwindCSS
- Typescript

## Resources

- [Introduction Web of Things concept - Wikipedia](https://en.wikipedia.org/wiki/Web_of_Things)
- [Introduction Thing Description - Wikipedia](https://en.wikipedia.org/wiki/Thing_Description)
- [Standard - W3C Web of Things - Thing Description](https://www.w3.org/TR/2023/REC-wot-thing-description11-20231205/)
- [Standard - W3C Web of Things (WoT) Modbus Binding](https://w3c.github.io/wot-binding-templates/bindings/protocols/modbus)
- [Web of Things Homepage](https://www.w3.org/WoT/)

## Contribution guide

Any contribution to this project is welcome.
Please follow our [contribution guide](./CONTRIBUTING.md).

## License

- [Eclipse Public License v. 2.0](http://www.eclipse.org/legal/epl-2.0)

## Prerequisites

- [Node.js](https://nodejs.org/), version 10+ (e.g., 10.13.0 LTS)

## Build

`yarn install` installs all the dependencies listed within package.json

`yarn build` builds the project for deployment

`yarn dev` starts a local development server on Port 3000 (http://localhost:3000)

## Development environment

In the development environment it is possible to use [react scan](https://react-scan.com/) to detect performance issues by analyzing the pop-up on the bottom right corner. The complete documentation is available [here](https://github.com/aidenybai/react-scan#readme).

### Using the Catalog Contribution Feature

You will need a [Thing Model Catalog](https://github.com/wot-oss/tmc) running somewhere. If you want to host it yourself, use the command-line interface to run one in the terminal using the following instructions:

```bash
    go install github.com/wot-oss/tmc@v0.1.2
    $GOPATH/bin/tmc
    ./tmc-linux-amd64
```

The most use commands to test are:

```bash
    tmc serve
    tmc repo add --type file <nameOfCatalog> ~/tm-catalog
```

A local repository folder will be created inside the tm-catalog directory

```bash
    tmc list
    tmc repo list
    tmc repo remove <nameOfCatalog>
```

### Send TD feature

#### Northbound and Southbound URLs

When using the **Send TD** feature, ediTDor communicates with a proxy that exposes
an HTTP interface for interacting with a Thing.

- **Southbound URL**
  - Base _Things API collection endpoint_ of the proxy where ediTDor sends the original Thing Description
  - ediTDor performs a `POST` to this endpoint; the proxy assigns the Thing/TD identifier
  - Used internally by the proxy to reach the underlying Thing using protocol-specific bindings (e.g., Modbus)

- **Northbound URL**
  - Base _Things API collection endpoint_ exposed by the proxy after the Thing Description is registered
  - ediTDor appends the encoded Thing/TD identifier to this base URL to fetch or interact with the proxied Thing Description
  - The proxied TD contains HTTP `href`s that ediTDor can invoke

In practice, ediTDor always interacts with the Thing **through the proxy via the Northbound URL**, while the Southbound URL is used internally by the proxy to communicate with the actual Thing.
To use the **_Send TD_** feature, it is necessary to define in the Settings pop-up the Southbound URL and Northbound URL. The Send TD feature allows you to send your Thing Description to any service following the WoT Discovery _Things API_ specification
(https://www.w3.org/TR/wot-discovery/#exploration-directory-api-things).
Afterwards, if the service proxies the TD, ediTDor can fetch the proxied TD containing HTTP `href`s to interact with the original Thing.

#### Configuration

1. Open the Settings pop-up from the main toolbar
2. Enter the **Southbound URL** (Things API collection endpoint, e.g. `http://localhost:8080/things/`)
3. Enter the **Northbound URL** (Things API collection endpoint exposed by the proxy)
4. Click Save to store the URLs

> ⚠️ Important  
> Do **not** paste a full Thing or TD resource URL (e.g. `/things/{id}`).
> Both Northbound and Southbound URLs must point to the **Things API collection endpoint**
> (typically ending with `/things/`).  
> ediTDor automatically appends the Thing/TD identifier when sending or fetching data.

The proxy uses the TD sent to its southbound API endpoint to communicate with a Thing. This way, you can interact with a non-HTTP Thing from your ediTDor.

### Automatically reading URL parameters

The ediTDor has the functionality to automatically set the following list of variables from a URL with query parameters:

1. tmcendpoint
2. repo
3. northbound
4. southbound
5. valuePath

Query parameters **tmcendpoint** and **repo** will set the value for the _TMC Catalog Endpoint_ and the _Name of Repository_, respectively, present in the Contribute to Catalog pop-up.

Example of use:

    http://localhost:5173/?tmcendpoint=http://localhost:8080&repo=my-catalog

Query parameters **northbound**, **southbound**, **valuePath** will set the value for the _Target URL Northbound_, _Target URL Southbound_, and _JSON Pointer Path_, respectively, under the Settings pop-up.

The _JSON Pointer Path_ is the path to the key on the JSON object where the value to be read or write is. This means when the ediTDor will try to read a value for a given property, the value the user will get from the response corresponds to the value of the key defined. In the case of a nested structure must be the path to the key using "/" character.
For example, in a JSON like `{"foo": {"bar":"somevalue"}}`, where `somevalue` is the value according the Data Schema of the TD, you should enter `/foo/bar`.

Example of use:

    http://localhost:5173/?northbound=http://localhost:8080&southbound=http://github.com&valuePath=/value

## Implemented Features:

- JSON Editor with JSON Schema support for TD (Autocompletion, JSON Schema Validation)
- Add Property, Action, Event by wizard
- Render TD to be more human-readable
- Validate JSON Syntax and JSON Schema for TD (JSONLD and Additional Validation for nested TM will be implemented in the future)
- Add a TM or TD via a CSV file (For now, Modbus only)
- Configuration on Settings page includes: southbound URL, northbound URL, save location, and configuration of the path value
