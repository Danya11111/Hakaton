import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function syncCompanyLocationAggregatesSeed(companyId: string) {
  const rows = await prisma.companyLocation.findMany({
    where: { companyId },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
  const locationCount = rows.length;
  const totalAreaSqM =
    locationCount === 0 ? 0 : rows.reduce((sum, r) => sum + (Number.isFinite(r.areaSqM) ? r.areaSqM : 0), 0);
  await prisma.company.update({
    where: { id: companyId },
    data: { totalAreaSqM, locationCount },
  });
}

async function backfillCompanyLocations() {
  const companies = await prisma.company.findMany({ include: { locations: true } });
  for (const c of companies) {
    if (c.locations.length > 0) {
      await syncCompanyLocationAggregatesSeed(c.id);
      continue;
    }
    const n = Math.max(1, c.locationCount || 1);
    const each = c.totalAreaSqM / n;
    let allocated = 0;
    for (let i = 0; i < n; i++) {
      const isLast = i === n - 1;
      const areaSqM = isLast ? Math.round((c.totalAreaSqM - allocated) * 1000) / 1000 : Math.round(each * 1000) / 1000;
      allocated += areaSqM;
      await prisma.companyLocation.create({
        data: {
          companyId: c.id,
          title: n > 1 ? `Локация ${i + 1}` : null,
          addressLine: "",
          areaSqM,
          locationType: null,
          sortOrder: i,
        },
      });
    }
    await syncCompanyLocationAggregatesSeed(c.id);
  }
}

const GROUPS = [
  {
    code: "A",
    slug: "dk",
    title: "Группа А",
    unitType: "Дома культуры",
    description:
      "Крупные культурные площадки, дома культуры и центры с событийной программой",
    sortOrder: 0,
  },
  {
    code: "B",
    slug: "libraries",
    title: "Группа Б",
    unitType: "Библиотеки",
    description: "Библиотеки и библиотечные площадки",
    sortOrder: 1,
  },
  {
    code: "V",
    slug: "museums",
    title: "Группа В",
    unitType: "Музеи",
    description: "Музеи и музейные пространства",
    sortOrder: 2,
  },
  {
    code: "G",
    slug: "ksc",
    title: "Группа Г",
    unitType: "Культурно-спортивные центры",
    description: "КСЦ и клубные пространства смешанного профиля",
    sortOrder: 3,
  },
  {
    code: "D",
    slug: "sport",
    title: "Группа Д",
    unitType: "Спортивные объекты",
    description: "Спортивные объекты без культурного профиля",
    sortOrder: 4,
  },
] as const;

type SeedCompany = {
  slug: string;
  name: string;
  shortName?: string | null;
  totalAreaSqM: number;
  locationCount: number;
  sourceOnlyInExcel?: boolean;
};

const COMPANIES: Record<(typeof GROUPS)[number]["slug"], SeedCompany[]> = {
  dk: [
    { slug: "vnukovo", name: "Внуково", totalAreaSqM: 6164.9, locationCount: 4 },
    { slug: "zvezdny", name: "Звёздный", totalAreaSqM: 5172.6, locationCount: 4 },
    { slug: "solnechny", name: "Солнечный", totalAreaSqM: 4392.9, locationCount: 2 },
    { slug: "moskovsky", name: "Московский", totalAreaSqM: 7591.5, locationCount: 1 },
    { slug: "pervomayskoe", name: "Первомайское", totalAreaSqM: 2168.9, locationCount: 1 },
    { slug: "desna-dk", name: "Десна", totalAreaSqM: 4587.4, locationCount: 3 },
    { slug: "kommunarka", name: "Коммунарка", totalAreaSqM: 2573.3, locationCount: 1 },
    { slug: "centr-most", name: "Центр Мост", totalAreaSqM: 1478.6, locationCount: 3 },
    { slug: "tckt", name: "ТЦКТ", totalAreaSqM: 1277.2, locationCount: 1 },
    { slug: "vatutinki", name: "Ватутинки", totalAreaSqM: 3406.7, locationCount: 1 },
    { slug: "shcherbinka-dk", name: "Щербинка", totalAreaSqM: 5048.4, locationCount: 2 },
    { slug: "peresvet", name: "Пересвет", totalAreaSqM: 952.4, locationCount: 1 },
    { slug: "druzhba", name: "Дружба", totalAreaSqM: 3988.2, locationCount: 1 },
    { slug: "yubileyny", name: "Юбилейный", totalAreaSqM: 1412.8, locationCount: 1 },
    { slug: "klenovo", name: "Кленово", totalAreaSqM: 3039.7, locationCount: 1 },
    {
      slug: "mihaylovskoe",
      name: "Михайловское",
      totalAreaSqM: 710.7,
      locationCount: 1,
      sourceOnlyInExcel: true,
    },
    {
      slug: "mosrentgen-dk",
      name: "Мосрентген",
      totalAreaSqM: 1182.1,
      locationCount: 1,
      sourceOnlyInExcel: true,
    },
  ],
  libraries: [
    { slug: "library-256", name: "Библиотека № 256", totalAreaSqM: 20.8, locationCount: 1 },
    { slug: "library-259", name: "Библиотека № 259", totalAreaSqM: 305.7, locationCount: 1 },
    { slug: "library-262", name: "Библиотека № 262", totalAreaSqM: 135.9, locationCount: 1 },
    { slug: "library-265", name: "Библиотека № 265", totalAreaSqM: 72.9, locationCount: 1 },
    { slug: "library-264", name: "Библиотека № 264", totalAreaSqM: 144.0, locationCount: 1 },
    { slug: "library-261", name: "Библиотека № 261", totalAreaSqM: 374.8, locationCount: 3 },
    { slug: "library-258", name: "Библиотека № 258", totalAreaSqM: 137.8, locationCount: 1 },
    { slug: "library-260", name: "Библиотека № 260", totalAreaSqM: 65.1, locationCount: 1 },
    { slug: "library-263", name: "Библиотека № 263", totalAreaSqM: 65.2, locationCount: 1 },
    { slug: "cbs-shcherbinka", name: "ЦБС Щербинка", totalAreaSqM: 722.4, locationCount: 3 },
    {
      slug: "mihaylovykh-1",
      name: "Библиотека № 1 им. Михайловых",
      totalAreaSqM: 401.0,
      locationCount: 1,
    },
    {
      slug: "mihaylovykh-2",
      name: "Библиотека № 2 им. Михайловых",
      totalAreaSqM: 189.8,
      locationCount: 1,
    },
  ],
  museums: [
    {
      slug: "aleksandrovo-shchapovo",
      name: "Музей усадьбы Александрово-Щапово",
      totalAreaSqM: 766.8,
      locationCount: 1,
    },
    {
      slug: "lyalko-museum",
      name: "Троицкий музей им. М. Н. Лялько",
      totalAreaSqM: 507.5,
      locationCount: 2,
    },
  ],
  ksc: [
    { slug: "mayak", name: "Маяк", totalAreaSqM: 528.3, locationCount: 5 },
    { slug: "ksc-kokoshkino", name: "КСЦ Кокошкино", totalAreaSqM: 855.8, locationCount: 1 },
    { slug: "lotos", name: "Лотос", totalAreaSqM: 1376.4, locationCount: 6 },
    { slug: "medved", name: "Медведь", totalAreaSqM: 522.8, locationCount: 1 },
    { slug: "filimonkovskoe", name: "Филимонковское", totalAreaSqM: 4415.3, locationCount: 1 },
    { slug: "voskresenskoe", name: "Воскресенское", totalAreaSqM: 1591.0, locationCount: 1 },
    { slug: "atlant", name: "Атлант", totalAreaSqM: 730.4, locationCount: 4 },
  ],
  sport: [
    { slug: "zarya", name: "Заря", totalAreaSqM: 955.3, locationCount: 2 },
    { slug: "mosrentgen-sport", name: "Мосрентген (спорт)", totalAreaSqM: 219.0, locationCount: 1 },
    { slug: "sosensky-sport", name: "Сосенский центр спорта", totalAreaSqM: 1036.0, locationCount: 2 },
    { slug: "orbita", name: "Орбита", totalAreaSqM: 953.0, locationCount: 3 },
    { slug: "monolit", name: "Монолит", totalAreaSqM: 287.0, locationCount: 1 },
  ],
};

async function main() {
  for (const g of GROUPS) {
    await prisma.group.upsert({
      where: { slug: g.slug },
      create: { ...g },
      update: {
        title: g.title,
        unitType: g.unitType,
        description: g.description,
        sortOrder: g.sortOrder,
        code: g.code,
      },
    });
  }

  for (const g of GROUPS) {
    const group = await prisma.group.findUniqueOrThrow({ where: { slug: g.slug } });
    const companies = COMPANIES[g.slug];
    for (const c of companies) {
      await prisma.company.upsert({
        where: { slug: c.slug },
        create: {
          groupId: group.id,
          slug: c.slug,
          name: c.name,
          shortName: c.shortName ?? null,
          totalAreaSqM: c.totalAreaSqM,
          locationCount: c.locationCount,
          sourceOnlyInExcel: c.sourceOnlyInExcel ?? false,
        },
        update: {
          name: c.name,
          shortName: c.shortName ?? null,
          totalAreaSqM: c.totalAreaSqM,
          locationCount: c.locationCount,
          sourceOnlyInExcel: c.sourceOnlyInExcel ?? false,
          groupId: group.id,
        },
      });
    }
  }

  await backfillCompanyLocations();
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
