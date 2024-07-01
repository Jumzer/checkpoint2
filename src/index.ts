import "reflect-metadata";
import express from "express";
import http from "http";
import cors from "cors";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { Arg, Field, InputType, Mutation, ObjectType, Query, Resolver, buildSchema } from "type-graphql";
import { Column, DataSource, Entity, PrimaryGeneratedColumn } from "typeorm";

@ObjectType()
@Entity()
export class Country {
	@Field()
	@PrimaryGeneratedColumn()
	id: number;

	@Field()
	@Column()
	code: string;

	@Field()
	@Column()
	name: string;

	@Field()
	@Column()
	emoji: string;

	@Field()
	@Column()
	continentCode: string;
}

@InputType()
class CountryInput {
	@Field()
	code: string;

	@Field()
	name: string;

	@Field()
	emoji: string;

	@Field()
	continentCode: string;
}

const AppDataSource = new DataSource({
	type: "sqlite",
	database: "checkpoint.sqlite",
	entities: [Country],
	synchronize: true,
});

@Resolver()
class CountryResolver {
	private countryRepository = AppDataSource.getRepository(Country);

	@Query(() => [Country])
	async getCountries() {
		console.log("Fetching countries...");
		const countries = await this.countryRepository.find();
		console.log("Fetched countries:", countries);
		return countries;
	}

	@Query(() => String, { nullable: true })
	async getCountryNameByCode(@Arg("code") code: string): Promise<string | null> {
		const country = await this.countryRepository.findOneBy({ code });
		if (!country) {
			return null;
		}
		return country.name;
	}

	@Query(() => [Country])
	async getCountriesByContinent(@Arg("continentCode") continentCode: string): Promise<Country[]> {
		const countries = await this.countryRepository.findBy({ continentCode });
		return countries;
	}

	@Mutation(() => Country)
	async addCountry(@Arg("infos") infos: CountryInput) {
		const country = this.countryRepository.create(infos);
		return await this.countryRepository.save(country);
	}
}

const app = express();
const httpServer = http.createServer(app);

const main = async () => {
	try {
		await AppDataSource.initialize();
		console.log("Data Source has been initialized!");
	} catch (err) {
		console.error("Error during Data Source initialization:", err);
	}

	const schema = await buildSchema({
		resolvers: [CountryResolver],
	});

	const server = new ApolloServer<{}>({
		schema,
		plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
	});

	await server.start();
	app.use("/", cors<cors.CorsRequest>(), express.json(), expressMiddleware(server));

	await new Promise<void>((resolve) => httpServer.listen({ port: 4000 }, resolve));
	console.log(`🚀 Server ready at http://localhost:4000/`);
};

main();
