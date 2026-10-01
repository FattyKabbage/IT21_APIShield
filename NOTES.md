# Backend
  - created backend using nestjs
  - added posgre database
  - installing prisma to communicate nestjs and postgre
        npm install -D prisma
        npm install @prisma/client @prisma/adapter-pg pg
  - initializing prisma
        npx prisma@latest orm init --yes --target postgres --authoring psl
  - verifying postgre connection
        npx prisma@latest db verify   
  - adding contracts
        npx prisma@latest contract emit
  - initialize db
        npx prisma@latest db init --db "postgresql://postgres:YOUR_PASSWORD@localhost:5432/apishield"
  - added the following
        prisma module
        prisma service
      then wire up to the app service

    ## Authentication 
  - then mag install sa following
        npm install 
        argon2  - password hashing
        @nestjs/jwt  -  security and verify jwt
        @nestjs/config  - env handling
        class-validator + class-transformer - dto validation and transformation
        helmet  -  http security headers
    
    - next kay para sa security foundation
      - mag add ug jwt configuration
            generating secret sa terminal
                node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
      - enable helmet uig global dto validation sa main.ts
      - magbuhat ConfigModulke sa app.module

 ## Changed the structure para sa maintenance ug di maglisod mangita
  -- module - business logics
  - Creating auth module along with the controller and service
      -dto for login and register

  # Creating bootstrap file on sysetm admin creation
    - addingsecret para secret lang
    para mangayo ug secret sa nodes na ctypto
            node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

#  Nag download postman para sa testing
  actual values

      - systemadmin@gmai.com
      - StrongPassword123!

# After creation / POST sa system admin
  - change auth module 
      -magbutang ug JWTModule na naka configure sa env

add the login logic inside servcice
then creating the payload using the userid, email ug iya role and turn it into a token

# Creating guards para sa access roles
  - src/common/guards
  - nest g guard common/guards/jwt-auth --no-spec

# Note para sa login
  - whenever mag log in/ need ang email ug password, then i authenticate sha using nestjs, after ma verify na nag match tanan then, didto na ang system muhatag ug access token na nasignan na sa jwt

  #creating decorator para hinlo ang controller
  mkdir src/common/decorators
  nest g decorator common/decorators/current-user --no-spec

  then gigaamit ang decorator para ma authz ang current user

  # BEFORE FRONT
   - Creating role decorator 
            nest g decorator common/decorators/roles --no-spec
      purpose ani is t diritso nga check sa isa ka controller instead of every controller
      @Roles('SYSTEM_ADMIN')
  - then adding rolesguard
      nest g guard common/guards/roles --no-spec

#Frontend na
      Adding vite
npm create vite@latest frontend -- --template react-ts


# Connecting React to Nest
  - created env sa frontend tas didto gibutang ang url sa nestjs
  - nag create ug services para sa where kuhaon ang url sa nest js
  - nagcreate ug auth api.ts na naa ang services para ma konek sa bisan asa na page

# Upon testing
  - working sha and need na mag add ug navihation samting nga naa ang backend along sa token

   - sa frontend
     npm install react-router
   - then mag create ug authentication context
      src/features/auth/auth.context.tsx
  ## Creatinf Dashboard page and routes

# runnning
 npm run dev
 npm run start:dev
 

 # Roles (Notes)
 system admin - ako
 organization 
   - owner ()
   - developer
 developer (no org)
   ### thats why we updated te prisma contact to postggresql

   npx prisma@latest db update
   npx prisma@latest contact emit

   npx prisma@latest db update --dry-run
   npx prisma@latest db update

   npx prisma@latest db verify


  #creating the mailpit for verification/authentication of registratiion

  # Mailpit
    - since ipit man kung smtp nga gmail gamiton, nag gamit nalang sa mailpit para sa localhost
  
   - then nag install nodemailer gikan sa nestjs
   npm install nodemailer
   npm install -D @types/nodemailer

   -- then nag create folder and files gamit ani
   nest g module lib/mail
    nest g service lib/mail

   --then nag add env para sa access instead of sa business logic para di sha mailisan
  MAIL_HOST=localhost
  MAIL_PORT=1025
  MAIL_USER=
  MAIL_PASSWORD=
  MAIL_FROM=noreply@apishield.local
  -- so when creating modules and service sa terminal, mag automatic sha mabutang sa app, module

  //then nag create temporary controller para ma test and mailkit
  nest g controller lib/mail

  then nag create ug get method para ma test
  
  # Registration Module
    - then nag change sa dto para sure na ang expected registration na format kay naa sa dto
    - then nag add ug register class sa authservice na connected sa mailservice
       --- ang token kay automatically naka hash

    -- then adding the registratoin end point sa auth.controller para ma utilize ang service which is ang business logic

    --testing sa registration

    --after tesitng, creating email verification of mailpit

    nest g class module/auth/dto/verify-email.dto --no-spec
        - dto make sure that token exist and string before ihatag or gamiton sa service
   --then mag add ug new method sa authservice which is verify email

    --AFTER CHANGING SHITS:
     - update anf authservice where di kasulod kung pending ang status or suspended
  -- testing done
 # actual building of registration frontend
   - nagbutang frontend url sa env and nag change ug send email sa auth service

  ## creation of verification - frontend
   - nag update sa auth.api.ts, nag add ug function na verify email para mag kontak sila ni nest

   - then nag add verifyemailpage
    - then gi add sa routes
    #### first error
     nag double send ang verification button thats why na failed ang output pero ang registered user kay na verified
     
 # Creating Module ORganization
  nest g module module/organization
  nest g controller module/organization
  nest g service module/organization

  --next is creating its dto

  ### The purpose of this is para ma invite ang developer nga under sa organization instead of ang developer mamili ug organization niya


 #### Mailpit
cccccccccccccccccccccccccccccccccccccc

# need ug two tokens sa invitation
       
# FOW
 - need mag login ni owner para maka invite 
 - then iyang ma invite lang muna kay authenticated user lang sa ron, next na ang wla na register sa database
    - shempre i verigy sa backend ang password na naka argon
    - then mag create ug jwt token para ana para then need i authenticate sa backend ang jwt naa sa 
    
    - then muagi sha sa jwtauthguard para mag verif if valid ba ang jwt
    - then muagi sha sa rolesguard para i check kung si user kay naka org role
    - then if goods tanan, mag nenerate na ang backend ug token na naka randomBytes and hashed 

    then marecord ni tanan sa database ang invitation 
   - tas isend via localhost mailpit

  ## Developer accept invitation
   -  since ang button kay naa naman daan token pwede ra i click sa developer ang button para ma aksept
   - if wala naka login, need niya mag login, same concept gihapom tas iibabalik niyag hash anf invitation token para ma compare sa database nga ang token kay match, then ma invited na sha as part of org


   - Swagger for documentation
     - npm install @nestjs/swagger sa backend
     -- modify maints

 


### 9/20/26 get organization members
  - create servce method for getoranization

  61f963b6-e9f4-462d-9d82-765372f8574a

  //created application crud

  # Creating application credential 
   - mag get sha ug secret para appication
  nest g module module/application-credential
nest g service module/application-credential --no-spec
nest g controller module/application-credential --no-spec


isses from the contact: errors:
Remove-Item .\src\prisma\contract.d.ts -Force -ErrorAction SilentlyContinue

Get-ChildItem .\src\prisma -Filter ".contract.d.ts.*.next.tmp" |
  Remove-Item -Force -ErrorAction SilentlyContinue
   --- deletes contract.d.ts and temporary failed contract d.ts

   --actually , need diay i npm rn build before i start:Dev


   # So ang jwt gikan sa auth kay pang manage sa request operations

  # Application auth

   - verify the clientID and ClientSecret 
   - checks also the application jwt
  # Then nag creat ug guard and decorator along with the generated nodecrypto hash para i verify ang cvlient secret uf client id annd then mag issue ug temporary jwt

  //TEST
   "id": "1ebf8def-dae7-4427-9c38-50c0ee499eea",
  "applicationId": "02c385bc-ffd3-4857-becc-a78e7dc68027",
  "clientId": "app_pcEp0-JKUd1I1sBaNa4V07mc",
  "clientSecret": "sk_1OKUMV2tftmQS7XXM8L42zCqRICd4iyY9F8qGaVKBXI",
  "status": "ACTIVE",

  {
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMmMzODViYy1mZmQzLTQ4NTctYmVjYy1hNzhlN2RjNjgwMjciLCJvcmdhbml6YXRpb25JZCI6Ijk2ZTAxM2M3LWNlNTQtNDJjNC04NTA5LWI2MTYyZDcyYzJhYyIsImNsaWVudElkIjoiYXBwX3BjRXAwLUpLVWQxSTFzQmFOYTRWMDdtYyIsInRva2VuVHlwZSI6IkFQUExJQ0FUSU9OIiwiaWF0IjoxNzkwNDY2MTM1LCJleHAiOjE3OTA0NjcwMzV9.-MxqtUiLAjoXNPDeobxc0Lkzt8bkDIi6Iv0alaXUN5A",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "application": {
    "id": "02c385bc-ffd3-4857-becc-a78e7dc68027",
    "name": "Test Application M1",
    "environment": "DEVELOPMENT"
  }
}


   so basicaly nagka error kay wala koy generated secret
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   

   # nest is third party api

    - so naka encrypt tanan key

    - created a contract para sa mga shits
    - note dont forget i cd backend
    - npx prisma contract emit
    -npx prisma db update --dry-run
    - npx prisma db  update
    - npx prisma db verify
    - npm run build

    node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
    --comand para pang sign ug shits

    -- then nag create ug security folder


    #security service
    PROVIDER_CREDENTIAL_ENCRYPTION_KEY
    → comes from backend/.env
    → belongs to APIShield
    → used to encrypt/decrypt

    Provider credential
    → comes from the organization owner
    → example: Google Maps key, PayMongo secret

    encryptedCredential
    → generated by AES-256-GCM from that provider credential
    → stored in PostgreSQL

 # then creation na sa api-integration modules
  nest g module module/api-integration
nest g service module/api-integration --no-spec
nest g controller module/api-integration --no-spec

# outbound url
  - creating outbound url foor internal security infrastracture
   - validatres basedURL

# since nag add man ug outbound and requres https, need i change anf baseURL and everything sa api inegration service as well as adding import sa module

# creating a gateway feature
Client Application
    ↓
Application JWT
    ↓
APIShield ApplicationJwtGuard
    ↓
integrationId
    ↓
ApiIntegration must belong to THIS application
    ↓
integration must be ACTIVE
    ↓
validate provider URL again
    ↓
decrypt provider credential with AES-256-GCM
    ↓
inject credential internally
    ↓
call third-party API
    ↓
return provider response

nest g module module/api-gateway
nest g service module/api-gateway --no-spec
nest g controller module/api-gateway --no-spec

jsonplacehollder:
fbb6e232-f1ba-4838-824a-fee81c2f528b

app id: 02c385bc-ffd3-4857-becc-a78e7dc68027
httpbin query : 6756872e-62de-450d-a3d8-114ec77d8ebc
{
  "method": "GET",
  "path": "/get",
  "query": {
    "hello": "apishield"
  }
}
httpbin header:
b3ed35c3-4499-49c2-a143-44ef52221e2a

{
  "method": "GET",
  "path": "/headers"
}
httpbin auth:
bc2684f6-db31-4c8f-a6d0-8e121be919af
{
  "method": "GET",
  "path": "/basic-auth/testuser/testpass"
}
bearer token
34e0082b-108f-4520-b712-184869913ef5
{
  "method": "GET",
  "path": "/bearer"
}

//then after mag query, i authenticate pa ang application

  //TEST 1
   "id": "1ebf8def-dae7-4427-9c38-50c0ee499eea",
  "applicationId": "02c385bc-ffd3-4857-becc-a78e7dc68027",
  "clientId": "app_pcEp0-JKUd1I1sBaNa4V07mc",
  "clientSecret": "sk_1OKUMV2tftmQS7XXM8L42zCqRICd4iyY9F8qGaVKBXI",
  "status": "ACTIVE",

  //2nd applicaiton
  "id": "7b878a41-6659-4eed-9045-59b40e9d25d0",
  "organizationId": "96e013c7-ce54-42c4-8509-b6162d72c2ac",
  "name": "2nd Test Application",
  "description": "2nd ttest",
  "environment": "DEVELOPMENT",
  //secret
  {
  "id": "abcd49bd-215d-4f56-8be7-fdc95a644300",
  "applicationId": "7b878a41-6659-4eed-9045-59b40e9d25d0",
  "clientId": "app_jS_M3qGQ8pl2MRQIlvybjUZF",
  "clientSecret": "sk_SVOtIOEn5sB-TuSP9ctuKutDaun79vjR7k9dgZ1c7Mg",
  "status": "ACTIVE",
  "createdAt": "2026-09-29 15:33:55.771501+08",
  "message": "Store this client secret securely. It will not be shown again."
}
API
{
  "id": "7fb04922-2c5e-4edb-876b-a76cb85729c9",
  "applicationId": "7b878a41-6659-4eed-9045-59b40e9d25d0",
  "name": "HTTPBin Query API Key",
  "provider": "HTTPBin",
  "baseUrl": "https://httpbin.org",
  "authType": "API_KEY",
  "credentialPlacement": "QUERY",
  "credentialName": "api_key",
  "hasCredential": true,
  "status": "ACTIVE",
  "createdAt": "2026-09-29 15:35:05.982542+08",
  "updatedAt": "2026-09-29 15:35:05.982542+08"
}

  

  # nag add ratelimit
    - per application 
npm install @nestjs/throttler@6.7.1
 - files na na create
  - guard ug security then gi add sa module sa apiintegration anf ratellimit paras request
  -

  # created activity log
  nag add ug table sa database
  only logs
  method
relative path
provider status
outcome
duration
application
integration
timestamp
dili need i log ang ff:
headers
requestBody
fullQuery
providerCredential
kay potentially naay pass, keys, tokens,data and all
 -- then nag add logger sa api-gateway service and sa request
 --then nag create ug activity log f

# creation sa front
#nag add rotation sa secret if mawala

test:
aasae


testss:
npm run build
npm run test
npm run test:e2e