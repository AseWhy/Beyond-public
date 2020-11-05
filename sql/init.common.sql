SET FOREIGN_KEY_CHECKS = 0;
SET FOREIGN_KEY_CHECKS = 0;
SET sql_notes = 0;

START TRANSACTION;
SET time_zone = "+00:00";

--
-- База данных: `beyond_common`
--
CREATE DATABASE IF NOT EXISTS `beyond_common` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;

USE `beyond_common`;

DROP TABLE IF EXISTS `binds`;
  CREATE TABLE IF NOT EXISTS `binds` (
    `work_ident` char(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
    `fire_after` bigint(255) NOT NULL,
    `excecutor` char(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
    `data` json DEFAULT NULL,
    PRIMARY KEY (`work_ident`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

DROP TABLE IF EXISTS `businesses`;
  CREATE TABLE IF NOT EXISTS `businesses` (
    `id` int(64) NOT NULL AUTO_INCREMENT,
    `condition_data` char(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
    `type` tinyint(8) NOT NULL DEFAULT '0' COMMENT '0 - работа\r\n1 - бизнес',
    `display` char(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
    `description` text COLLATE utf8mb4_unicode_520_ci,
    `data` json DEFAULT NULL,
    PRIMARY KEY (`id`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

DROP TABLE IF EXISTS `characters`;
  CREATE TABLE IF NOT EXISTS `characters` (
    `id` int(32) NOT NULL AUTO_INCREMENT COMMENT 'Идентификатор персонажа',
    `sex` bit(1) DEFAULT b'0' COMMENT '0 - м, 1 - ж',
    `name` char(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL COMMENT 'Имя персонажа',
    `origin` char(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL COMMENT 'Происхождение персонажа',
    `health` int(64) NOT NULL DEFAULT '50' COMMENT 'Текущее здоровье персонажа',
    `endurance` int(64) NOT NULL DEFAULT '80' COMMENT 'Текущая выносливость персонажа',
    `experience` bigint(255) NOT NULL DEFAULT '0' COMMENT 'Текущий опыт персонажа',
    `inventory` json DEFAULT NULL COMMENT 'Инвентарь персонажа',
    `country` char(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL COMMENT 'Персонаж принадлежит к стране',
    `owner` char(255) COLLATE utf8mb4_unicode_520_ci NOT NULL COMMENT 'Пользователь-персонажа',
    `updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Персонаж обновлен',
    `busts` text COLLATE utf8mb4_unicode_520_ci COMMENT 'Бонусы персонажа',
    `map` text COLLATE utf8mb4_unicode_520_ci NOT NULL COMMENT 'Данные карты: карта/регион/провинция/город/район/..',
    `data` json DEFAULT NULL COMMENT 'Данные персонажа',
    `confirmation` json DEFAULT NULL COMMENT 'Данные для подтверждения',
    `own` text COLLATE utf8mb4_unicode_520_ci,
    `businesses` text COLLATE utf8mb4_unicode_520_ci,
    PRIMARY KEY (`id`),
    KEY `origin` (`origin`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

DROP TABLE IF EXISTS `data`;
  CREATE TABLE IF NOT EXISTS `data` (
    `field_name` char(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
    `description` text COLLATE utf8mb4_unicode_520_ci,
    `data` json DEFAULT NULL,
    UNIQUE KEY `field_name` (`field_name`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

DROP TABLE IF EXISTS `origin_defaults`;
  CREATE TABLE IF NOT EXISTS `origin_defaults` (
    `pd_origin_name` char(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
    `pd_origin_display` char(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
    `pd_origin_desc` text COLLATE utf8mb4_unicode_520_ci,
    `data` json NOT NULL,
    UNIQUE KEY `pd_origin_name` (`pd_origin_name`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

DROP TABLE IF EXISTS `perks`;
  CREATE TABLE IF NOT EXISTS `perks` (
    `named_id` char(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
    `display` char(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
    `stats` json DEFAULT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

DROP TABLE IF EXISTS `users`;
  CREATE TABLE IF NOT EXISTS `users` (
    `id` bigint(255) NOT NULL,
    `registered` tinyint(1) NOT NULL DEFAULT '0',
    `banned` tinyint(1) NOT NULL DEFAULT '0',
    `scenario` char(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
    `scenario_state` int(8) NOT NULL DEFAULT '0',
    `scenario_data` json DEFAULT NULL,
    `notify` tinyint(1) NOT NULL DEFAULT '1',
    `keyboard` JSON NULL DEFAULT NULL COMMENT 'Последняя сохраненная клавиатура',
    `created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

INSERT INTO `origin_defaults` (`pd_origin_name`, `pd_origin_display`, `pd_origin_desc`, `data`) VALUES
  ('nobleman', 'Дворянин', 'Ваша семья имеет благородное происхождение, приближённое к высшей знати. Хоть чернь, копающаяся в грязи и не оценит этого достижения, но стоит признать что родиться в такой семье уже огромная удача. \r\n\r\nВсё ваше детство вы читали книги, играли на старинном рояле и тратили время на развитие, а не на пустые взмахи серпом.', '{\"pay\": {\"bans\": 300}, \"busts\": {\"health\": 0, \"endurance\": 0}, \"stats\": {\"agility\": 0, \"strength\": -3, \"intelligence\": 6}, \"skills\": {\"craft\": 0, \"trade\": 0, \"battle\": 0, \"command\": 0, \"control\": 20}}'),
  ('peasant', 'Крестьянин', 'Описание: Ваша жизнь тяжела и монотонна. Это и закалило вас. С самого рождения вы трудились, как трудился ваш отец, отец вашего отца и его отец… \r\n\r\nВсё ваше детство вы выращивали овощи, забивали скот, это сделало вас сильнее физически, но времени на развитие умственное попросту не осталось.', '{\"pay\": {\"bans\": 0}, \"busts\": {\"health\": 0, \"endurance\": 40}, \"stats\": {\"agility\": 0, \"strength\": 6, \"intelligence\": -2}, \"skills\": {\"craft\": 0, \"trade\": 0, \"battle\": 0, \"command\": 0, \"control\": 20}}'),
  ('hereditary_merchant', 'Потомственный торговец', 'В семье, где все средства добываются куплей-продажей тяжело не научиться хорошо менять товары на металлические кругляшки. Где-то схитрить, где-то изменить свою версию “правды”. \r\n\r\nВсё ваше детство вас учили торговать и, порой, иногда даже продавать не совсем “свежие” продукты, “слегка” покрытые “целительным” мхом. В конце концов те кто попробовал такую еду попросту не смогут дойти до вас с жалобой…', '{\"pay\": {\"bans\": 0}, \"busts\": {\"health\": 0, \"endurance\": 0}, \"stats\": {\"agility\": 0, \"strength\": -1, \"intelligence\": 2}, \"skills\": {\"craft\": 0, \"trade\": 25, \"battle\": 0, \"command\": 0, \"control\": 0}}'),
  ('astrologer', 'Звездочёт', 'Мало кто может признать настоящий интеллект, ум, опередивший своё время. Звёзды потрясающе выглядят и для их изучения вы потратили немало времени на прочтение трудов других астрономов.\r\n\r\nВсё ваше детство общество не могло разделить ваш интерес к небу, а порой и вовсе порицали за “богохульство”, но вас это не остановило. Хоть множество книг рассказывают больше о ретроградном меркурии, чем о нормальной науке о звёздах, всё же от этих знаний есть польза.', '{\"pay\": {\"bans\": 0}, \"busts\": {\"health\": 0, \"endurance\": 0}, \"stats\": {\"agility\": 0, \"strength\": -2, \"intelligence\": 7}, \"skills\": {\"craft\": 0, \"trade\": 0, \"battle\": 0, \"command\": 0, \"control\": 0}}'),
  ('thief', 'Вор', 'Родившись в семье, где порой нет даже двух банов на буханку хлеба приходится адаптироваться к реалиям жизни. Общество говорить что воровать плохо? Голодать еще хуже.\r\n\r\nВсё ваше детство вы воровали еду, деньги, занимались карманничеством и стали очень ловко обманывать людей, втюхивая им краденое.', '{\"pay\": {\"bans\": 0}, \"busts\": {\"health\": 0, \"endurance\": 0}, \"stats\": {\"agility\": 8, \"strength\": 0, \"intelligence\": 0}, \"skills\": {\"craft\": 0, \"trade\": 5, \"battle\": 0, \"command\": 0, \"control\": 0}}'),
  ('guard', 'Стражник', 'Защищать людей - долг. Человеческая жизнь есть высшая ценность, как мораль, доблесть и честь. Слабые не виновны в том, что они не способны постоять за себя. Даже если они воспринимают стражников как вросших в землю болванчиков.\r\n\r\nВсё ваше детство вы взращивали в себе моральные принципы и мышцы. Постоянные тренировки сделали вас сильнее, теперь вы готовы защитить людей… И свой кошелёк, конечно же.', '{\"pay\": {\"bans\": 0}, \"busts\": {\"health\": 0, \"endurance\": 0}, \"stats\": {\"agility\": 2, \"strength\": 8, \"intelligence\": -2}, \"skills\": {\"craft\": 0, \"trade\": 0, \"battle\": 30, \"command\": 0, \"control\": 0}}'),
  ('adventurer', 'Авантюрист', 'Рубить монстров, людей, какая разница? Важен вес мешка с банами, который станет наградой. Хоть такая профессия порой и порицается людьми, но кто-то должен выполнять грязную работу.\r\n\r\nВсё ваше детство вы выполняли “халтурки”. Принеси-подай, сходи и отбери, защити того, побей другого. Это дало вам специфичный набор навыков.', '{\"pay\": {\"bans\": 0}, \"busts\": {\"health\": 0, \"endurance\": 0}, \"stats\": {\"agility\": 3, \"strength\": 3, \"intelligence\": 0}, \"skills\": {\"craft\": 0, \"trade\": 10, \"battle\": 10, \"command\": 0, \"control\": 0}}'),
  ('patrician', 'Патриций', 'Ваши предки  лица, принадлежавшие к зажиточным бюргерским родам, игравшим главную роль в городском самоуправлении, это означает что вы с детства имеете навыки к управлению,а также некоторые накопления\n\nВсё ваше детство вы ходили на заседания городского совета, играли на старинном рояле и развивали собственную предприимчивость.', '{\"pay\": {\"bans\": 500}, \"busts\": {\"health\": 0, \"endurance\": 0}, \"stats\": {\"agility\": 0, \"strength\": -3, \"intelligence\": 6}, \"skills\": {\"craft\": 0, \"trade\": 0, \"battle\": 0, \"command\": 0, \"control\": 20}}'),
  ('salter', 'Солевар', 'Описание: Вы являетесь наследственным ремесленником, а именно вы как и все ваши предки занимаетесь варкой соли, в народе эта профессия считается благородной и к таким как вы относятся с почтением\r\n\r\nВсё ваше детство вас учили как варить соль и, порой, иногда даже отсылать заказчикам не тот объем соли, добавляя в нее утяжелительные порошки. В любом случае по такой цене они еще должны быть рады что вообще нашли такое предложение.', '{\"pay\": {\"bans\": 0}, \"busts\": {\"health\": 0, \"endurance\": 0}, \"stats\": {\"agility\": 0, \"strength\": 2, \"intelligence\": 1}, \"skills\": {\"craft\": 0, \"trade\": 10, \"battle\": 0, \"command\": 0, \"control\": 0}}'),
  ('gravedigger', 'Могильщик', 'Ваша жизнь тяжела, вы сын кладбищника, человека который следил за кладбищем, следил за проведением похорон, а также делал гробы и иногда даже копал могилы. Это  закалило вас. С самого рождения вы трудились, как трудился ваш отец, следовательно вы получили весьма специфические навыки. \r\n\r\nВсё ваше детство вы готовили людей в их последний путь, делали гробы, а также вы видели много трупов воинов, что означает понимание самых уязвимых точек тела. ', '{\"pay\": {\"bans\": 0}, \"busts\": {\"health\": 0, \"endurance\": 25}, \"stats\": {\"agility\": 0, \"strength\": 3, \"intelligence\": 1}, \"skills\": {\"craft\": 0, \"trade\": 0, \"battle\": 10, \"command\": 0, \"control\": 0}}'),
  ('brat', 'Сын куртизанки', 'Ваша жизнь тяжелее чем у кого-то еще. Это ужасно, но ваша мать являлась труженицей ночи, из-за этого вас гнобили в детстве, а также почти что вычеркнули из социальной жизни. Это безусловно отвратительно, но это дало вам знания и силы которых нет у других людей\r\n\r\nЧтобы выжить вам пришлось развивать все направления понемногу лишь бы выжить в этом жестоком мире.', '{\"pay\": {\"bans\": 0}, \"busts\": {\"health\": 0, \"endurance\": 0}, \"stats\": {\"agility\": 2, \"strength\": 2, \"intelligence\": 2}, \"skills\": {\"craft\": 0, \"trade\": 7, \"battle\": 10, \"command\": 0, \"control\": 0}}'),
  ('herbalist', 'Травник', 'С самого детства вы обучались у своих родителей искусству врачевания травами, из-за того что вы эти травы еще и добывали, вы получали некоторую физическую нагрузку, а также уроки выживания в лесу.\r\n\r\nВсе ваше детство вы учились различать травы между собой, а также применять их по назначению, конечно же добывая и готовя их самостоятельно.', '{\"pay\": {\"bans\": 100}, \"busts\": {\"health\": 0, \"endurance\": 10}, \"stats\": {\"agility\": 0, \"strength\": 1, \"intelligence\": 1}, \"skills\": {\"craft\": 0, \"trade\": 0, \"battle\": 0, \"command\": 0, \"control\": 0}}'),
  ('smith', 'Кузнец', 'Ваша жизнь связана с кузнечеством, вы сын кузнеца, человека который создавал инструменты, оружие, а предметы утвари. Это  закалило вас. С самого рождения вы трудились, как трудился ваш отец, следовательно вы получили навыки кузнеца. \r\n\r\nВсё ваше детство вы были подмастерьем кузнеца, а также жили в его семье, большинство навыков которые он мог вам передать вы усвоили. ', '{\"pay\": {\"bans\": 0}, \"busts\": {\"health\": 0, \"endurance\": 40}, \"stats\": {\"agility\": 0, \"strength\": 6, \"intelligence\": 1}, \"skills\": {\"craft\": 0, \"trade\": 0, \"battle\": 10, \"command\": 0, \"control\": 0}}');

INSERT INTO `businesses` (`id`, `condition_data`, `type`, `display`, `description`, `data`) VALUES
  (1, 'true', 1, 'Торговая повозка', 'Небольшая повозка, наполненная различными товарами, которые были привезены из соседний городов. Магазины нередко покупают эти товары по-дешевке. ', '{\"cost\": 2000, \"type\": 1, \"income\": 200}'),
  (2, 'sity.port = true', 1, 'Магазин рыболовных снастей', 'В этом городе высокий спрос на рыбу и, соответственно. на удочки, снасти тоже. Небольшое вложение и рыбаки смогут закупать товары у нас.', '{\"0\": \"{\", \"1\": \"}\", \"cost\": 2750, \"income\": 220}'),
  (3, 'true', 1, 'Астрологический магазин', 'Все товары на любой вкус. От сатанистских обрядов до телескопа - товары для каждого в меру своего безумия.', '{\"cost\": 4350, \"income\": 290}'),
  (4, 'true', 1, 'Бакалейная лавка', 'Бинты, травы, еда. Всё что может понадобиться авантюристу продается именно здесь.', '{\"cost\": 6125, \"income\": 350}'),
  (5, 'true', 1, 'Небольшая кузня', 'Собственная кузня, которая сможет выполнять частные заказы. И хотя цена за оружие порой бывает высока из-за сложности изготовления денег в итоге остается не так уж и много.', '{\"cost\": 8000, \"income\": 450}'),
  (6, 'true', 1, 'Ремесленная мастерская', 'Описание: Мастерская по изготовлению любого снаряжения. Все что может понадобиться путнику, собирающемуся в долгую дорогу, или же торговцу, желающему купить оружие для самообороны или убеждения в качестве его товара.', '{\"cost\": 11250, \"income\": 500}'),
  (7, 'sity.port = true', 1, 'Магазин морепродуктов', 'В этом городе имеется возможность ловить рыбу в больших количествах. Мы наймем несколько рыбаков, продавая их рыбу в нашем магазине. Процент им, процент нам. ', '{\"cost\": 12625, \"income\": 650}'),
  (8, 'true', 1, 'Мануфактурное предприятие', 'Десятки рук, обезличенных простым трудом. Нам не нужен человек для производства, нам нужна лишь часть человека. Здесь можно массово производить всё что пожелает большой заказчик или, может быть, даже региональное управление.', '{\"cost\": 20000, \"income\": 800}'),
  (9, 'true', 1, 'Ювелирная мастерская', 'Отрада для знати, желающей обогатить свой внешний вид и количество перстов на пальцах.', '{\"cost\": 25000, \"income\": 1000}'),
  (10, 'true', 1, 'Опорная точка шахтёров', 'Мы наймем небольшую команду рудокопов. Они будут добывать ископаемые, взамен мы обеспечим их инструментами и провизией. Выгода с товаров на продажу уйдет в карман.', '{\"cost\": 27000, \"income\": 1500}'),
  (11, 'sity.temple = true', 1, 'Магазин религиозной атрибутики', 'У любой религии есть отличительная атрибутика. Кольца, мантии, посохи. Её последователи охотно приобретут её у нас, после небольшого договора с местным духовенством.', '{\"cost\": 30000, \"income\": 1700}'),
  (12, 'true', 1, 'Торговая ярмарка', 'Множество лавок арендуются торговцами и предпринимателями, взамен на процент с их товара в пользу бизнеса.', '{\"cost\": 40000, \"income\": 2000}'),
  (13, 'character.origin != \'nobleman\'', 0, 'Уборщик', '', '{\"cost\": 1, \"income\": 2}'),
  (14, 'true', 0, 'Помощь на кухне', '', '{\"cost\": 2, \"income\": 3}'),
  (15, 'character.stats.strength.value >= 5 & character.origin != \'nobleman\'', 0, 'Портовый грузчик', '', '{\"cost\": 2, \"income\": 5}'),
  (16, 'sity.temple = true & character.origin = \'astrologer\'', 0, 'Проповедник', NULL, '{\"cost\": 20, \"type\": 1, \"income\": 80, \"duration\": 900000}'),
  (17, 'character.stats.strength.value >= 5 & character.origin != \'nobleman\' & character.origin != \'astrologer\' & character.origin != \'hereditary_merchant\'', 0, 'Работа в шахте', NULL, '{\"cost\": 3, \"income\": {\"bans\": 7, \"backpack\": 5}}'),
  (18, 'character.origin != \'peasant\'', 0, 'Продавец в бакалейной лавке', NULL, '{\"cost\": 15, \"type\": 1, \"income\": 100, \"duration\": 1500000}'),
  (19, 'character.origin != \'peasant\'', 0, 'Вакансия бригадира', NULL, '{\"cost\": 20, \"type\": 1, \"income\": 125, \"duration\": 1200000}');

ALTER TABLE `characters`
  ADD CONSTRAINT `characters_ibfk_1` FOREIGN KEY (`origin`) REFERENCES `origin_defaults` (`pd_origin_name`);

COMMIT;

SET sql_notes = 1;
SET FOREIGN_KEY_CHECKS = 1;