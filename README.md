<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

## Description

Project for handling transactions received in csv format files

## Documentation

[Notion Link](https://www.notion.so/Design-doc-a8c75bbe0cf24db4b5799596af6d3988?pvs=4)

## Project setup

1. Clone the project
2. `yarn install`
3. Clone the file `.env.template` and renamed as `.env`
4. Fill the enviroment variables
5. Run the database with the following command

```
docker-compose up -d
```

6. Generate and run the migrations

```
yarn migration:generate
yarn migration:run
```

## Compile and run the project

```bash
# development
$ yarn run start

# watch mode
$ yarn run start:dev

# production mode
$ yarn run start:prod

# run migrations
$ yarn migration:run

# generate migrations
$ yarn migration:generate

```
