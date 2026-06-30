import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { env } from "@config/env";

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
	const hashedPassword = await Bun.password.hash(env.DEFAULT_PASSWD);

	const admin = await prisma.user.upsert({
		where: { username: env.DEFAULT_USERNAME },
		update: {},
		create: {
			fullname: "System Administrator",
			username: env.DEFAULT_USERNAME,
			password: hashedPassword,
			role: "ADMIN",
			isActive: true,
		},
	});

	console.log({ admin });
}

main()
	.then(async () => {
		await prisma.$disconnect();
	})
	.catch(async (e) => {
		console.error(e);
		await prisma.$disconnect();
		process.exit(1);
	});
