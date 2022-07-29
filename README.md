# Netacea Akamai EdgeWorker Template

![Netacea Header](https://assets.ntcacdn.net/header.jpg)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)

A simple Akamai EdgeWorker with Netacea built in.

## ❗ Note
Currently we have a workaround in place to get around some rollup issues. We generate the main.js that will ultimately go in the bundle and then do some string replacements to get the code in the state we want. This is overly brittle and will look to amend with a better solution asap. The work around can be found in rollup.config.js lines 22-25 and lines 30-31.

## 💡 Getting Started

In order to properly deploy Netacea Akamai integration it is required to create EdgeWorker ID and properly configure Property within a group.

1. Akamai EdgeWorker - Create an EdgeWorker ID
    a. Name could be whatever fits your needs. 
    b. In the Group selection select one where you will have property to set up for this integration.
    c. It is important that the worker is resource tier 200, i.e. Dynamic Compute. The lower resource tier is not sufficient for our needs.
2. Akamai Property Configuration
    a. Variables
    * PMUSER_NETACEA_API_KEY - Initial Value should contain api key; Security: Sensitive
    * PMUSER_NETACEA_SECRET_KEY - Initial Value should contain secret key; Security: Sensitive
    * PMUSER_CLIENT_IP - you can leave it blank; Security: Visible
    * PMUSER_NETACEA_MITIGATION_TYPE - Initial Value should be set to MITIGATE or INJECT or INGEST; Security: Visible
    * PMUSER_NETACEA_INGEST_TYPE - Initial Value should be HTTP; Security: Visible
    
    b. New Rule: EdgeWorker
    * Criteria
        * If: 
            * Request Header: "X-Netacea-ProxyPass" is not one of: "ingest" "mitigation"
            * NOTE: We skip the EdgeWorker on subrequests destined for the Mitigation or Ingest service. 
    * Behaviors
        * Set Variable
            * Variable: PMUSER_CLIENT_IP 
            * Create Value From: Expression
            * Expression: {{builtin.AK_CLIENT_REAL_IP}}
            * Operation: None
        * EdgeWorkers
            * Enbable: ON
            * Identifier: here you select EdgeWorker ID that you have created in step 1
    
    c. New Rule: Ingest Origin
    - Criteria
        - If: 
            - Request Header: "X-Netacea-ProxyPass" is one of: "ingest"
            - NOTE: The Worker will add this header to a subrequest when it wants to make a call to the Ingest Service. 
    - Behaviors
        - Origin Server
            - Origin Type: Your Origin
            - Origin Server Hostname: Ingest Hostname provided by Netacea
            - Forward Host Header: Origin Hostname
            - Cache Key Hostname: Origin Hostname
            - Supports Gzip Compression: Yes
            - Send True Client IP Header: Yes
            - True Client IP Header Name: True-Client-IP
            - Allow Clients to Set True Client IP Header: No
            - Verification Settings: Choose Your Own
            - Use SNI TLS Extension: Yes
            - Match CN/SAN To: {{Origin Hostname}} {{Forward Host Header}}
            - Trust: Specific Certificates (pinning)
            - Specific Certificates: Select your domain's certificate
            - HTTP Port: 80
            - HTTPS Port: 443
        - Allow POST
            - Behavior: Allow
            - Allow POST without Content-Length header: Allow
            
    d. New Rule: Mitigation Origin
    - Criteria
        - If: 
            - Request Header: "X-Netacea-ProxyPass" is one of: "mitigation"
            - NOTE: The Worker will add this header to a subrequest when it wants to make a call to the Mitigation Service. 
    - Behaviors
        - Origin Server
            - Origin Type: Your Origin
            - Origin Server Hostname: Mitigations URL provided by Netacea
            - Forward Host Header: Origin Hostname
            - Cache Key Hostname: Origin Hostname
            - Supports Gzip Compression: Yes
            - Send True Client IP Header: Yes
            - True Client IP Header Name: True-Client-IP
            - Allow Clients to Set True Client IP Header: No
            - Verification Settings: Choose Your Own
            - Use SNI TLS Extension: Yes
            - Match CN/SAN To: {{Origin Hostname}} {{Forward Host Header}}
            - Trust: Specific Certificates (pinning)
            - Specific Certificates: Select your domain's certificate
            - HTTP Port: 80
            - HTTPS Port: 443
        - Allow POST
            - Behavior: Allow
            - Allow POST without Content-Length header: Allow
            
    e. New Rule: Conditional Origin Group
    - Allow Condtional Origins
        - Enable: Yes
        - Honor Origin Base Path: Yes
        - Origin Purge Query Parameter: originId
    
    f. New Rule (grouped under Conditional Origin Group): Conditional Origin Definition
     - Criteria
        - If: 
            - "Conditional Origin ID" is defined as: "mitigations"
            - NOTE: The Worker will add this header to a subrequest when it wants to make a call to the Mitigation Service. 
    - Behaviors
        - Origin Server
            - Origin Type: Your Origin
            - Origin Server Hostname: Mitigations URL provided by Netacea
            - Forward Host Header: Incoming Host Header
            - Cache Key Hostname: Origin Hostname
            - Supports Gzip Compression: Yes
            - Send True Client IP Header: No
            - Verification Settings: Choose Your Own
            - Use SNI TLS Extension: No
            - Match CN/SAN To: {{Origin Hostname}} {{Forward Host Header}}
            - Trust: Akamai-managed Certificate Authorities Sets
            - Akamai-managed Certificate Authority Sets:
                - Akamai Certificate Store: Enabled
                - Third Party Certificate Store: Disabled
            - HTTP Port: 80
            - HTTPS Port: 443
        - Allow POST
            - Behavior: Allow
            - Allow POST without Content-Length header: Allow
    
    g. Fail Open
    - Add to the Property Variables following ones:
        - PMUSER_ORIG_HOST
            - Initial Value: %(AK_HOST)
            - Description: Host used for Netacea failover
            - Security: Visible
        - PMUSER_FAILOVER_SECRET
            - Initial Value: {secret_goes_here}
                - NOTE: Be sure to use a secure secret. Preferably, generate a 20+ character long secret using a password manager.
            - Description: Secret value for x-ew-failover header
            - Security: Sensitive
        - PMUSER_FAILOVER_HEADER_VALUE
            - Description: Value of x-ew-failover-header
            - Security: Sensitive
        - PMUSER_CLIENT_IP
            - Description: True IP of client
            - Security: Visible
    - Optional: You can create an empty rule to group others or if you prefer to you can group them under your origin rule.
    - New Rule: Set Failover Variable
        - Description: In order to compare the failover value header we must read it from the header and in to a variable. We then remove the header to prevent leaking of the secret.
        - Criteria
            - If:
                - Request Header: "x-ew-failover" exists
        - Behaviors
            - Set Variable
                - Variable: PMUSER_FAILOVER_HEADER_VALUE
                - Create Value From: Extract
                - Get Data From: Request Header
                - Header Name: x-ew-failover
                - Operation: None
            - Modify Incoming Request Header
                - Action: Remove
                - Select Header Name: Other...
                - Custom Header Name: x-ew-failover
    - New Rule: Netacea Fail Open
        - Description: This can live outside of the Company rule group if more than one origin is being configured for protection.
        - Criteria
            - If:
                - Metadata Stage is client-response
                - AND
                - EdgeWorkers Execution Failure
        - Behaviors
            - Site Failover
                - Enable: On
                - Action: Use alternate hostname in this property
                - Alterante Hostname in This: {{user.PMUSER_ORIG_HOST}}
                - Modify Request Path: No
            - Advanced
                - Description: Add "x-ew-failover:true" header on failover request
                - Advanced XML (NOTE: This part can only be set by an Akamai engineer):
                - 
                        <forward:availability.fail-action2>
                        <add-header>
                            <status>on</status>
                            <name>x-ew-failover</name>
                            <value>%(PMUSER_FAILOVER_SECRET)</value>
                        </add-header>
                        </forward:availability.fail-action2>


##### ✔️ Akamai configuration finished!
Now you are almost ready to deploy the code the Akamai.
What's left is running `npm install` and setting the configuration file.

## Running a sandbox
If you would like to run a sandbox please refer to the [official Akamai documentation](https://developer.akamai.com/tools/akamai-sandbox) where you can find proper instructions.

## Developer note

Sometimes, the sandbox doesn't immediately pickup the configuration from the remote - if you find your edgeworker is being ignored in the sandbox, try restarting your sandbox a few times.

## 💻 Developing
If you need to extend or enhance the functionality of the Akamai EdgeWorker, the documentation can be found [here](https://developer.akamai.com/akamai-edgeworkers-overview).
Code extensions should be made in `./src/index.ts`.

Please ensure that as a minumum your `onClientRequest` handler contains:
```javascript
await worker.requestHandler(request)
```
and your `onClientResponse` handler contains:
```javascript
 await worker.responseHandler(request, response)
```

## ❗ Issues
If you run into issues with this specific project, please feel free to file an issue [here](https://github.com/Netacea/akamai-edgeworker-template-typescript/issues).
