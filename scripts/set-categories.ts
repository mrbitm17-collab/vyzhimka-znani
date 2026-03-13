import "dotenv/config";
import { prisma } from "../src/server/db";

const CATEGORIES: [string, string][] = [
  ["UCcz_GEYeb44A2JE7vtTR_ig", "Бизнес"],
  ["UC0yHbz4OxdQFwmVX2BBQqLg", "AI"],
  ["UCxLQz3Bhp6fxDnT4J5zwnvQ", "AI"],
  ["UCW6QeFhV3uUJi0fvjYdkqzg", "AI"],
  ["UCfQNB91qRP_5ILeu_S_bSkg", "AI"],
  ["UCrDwWp7EBBv4NwvScIpBDOA", "AI"],
  ["UCId9a_jQqvJre0_dE2lE_Rw", "Технологии"],
  ["UCSxPE9PHHxQUEt6ajGmQyMA", "AI"],
  ["UC2gtQOm5jFEASO6mg_ibT_Q", "AI"],
  ["UCuKVsDS3oVzTuNjnQ79pEEg", "Технологии"],
  ["UCwAnu01qlnVg1Ai2AbtTMaA", "Продуктивность"],
  ["UCGpsgNbzdF7BECCVbB1COHw", "SEO / Маркетинг"],
  ["UCtgZ4-4GI85PPMCCgzrdBgA", "AI"],
  ["UCxgAuX3XZROujMmGphN_scA", "Финансы"],
  ["UC2ojq-nuP8ceeHqiroeKhBA", "AI"],
  ["UCM_ka9z2rAH6wSSjfdhRgVw", "AI"],
  ["UCmeU2DYiVy80wMBGZzEWnbw", "AI"],
  ["UCnpBg7yqNauHtlNSpOl5-cg", "Технологии"],
  ["UCLA7cJBnqr0nLF2bQBD9uUg", "AI"],
  ["UCLk7uewdd5s7kszfy736ScA", "AI"],
  ["UCH6k750mdcOXU6PYHSCOlrA", "Бизнес"],
  ["UCmxeYVU2qMS-w5G3QQpQ1tA", "AI"],
  ["UCO66zvpQorlNfs_7hFCfmaw", "Образование"],
  ["UCAuUUnT6oDeKwE6v1NGQxug", "Образование"],
  ["UCHhYXsLBEVVnbvsq57n1MTQ", "AI"],
  ["UC2UXDak6o7rBm23k3Vv5dww", "Технологии"],
  ["UCYwLV1gDwzGbg7jXQ52bVnQ", "AI"],
  ["UClXAalunTPaX1YV185DWUeg", "AI"],
  ["UCuaYG7fdQ-4myL_CVtvwNHQ", "Бизнес"],
  ["UCaR6XjSJJsLbKN3n6VYsGKw", "Бизнес"],
  ["UCVVNJJXC7TQgPpAjQdgrqNw", "Бизнес"],
  ["UCgdWHRfIsTD6HzSTBUAIsGw", "Технологии"],
  ["UCjiDBsEL3QtROdoM-FphuKQ", "Продуктивность"],
  ["UCoVpToOpCIPNOxdGHBsLRkw", "Бизнес"],
  ["UCEbHY5kY9881hKPNrRtxfhQ", "Бизнес"],
  ["UCLkP6wuW_P2hnagdaZMBtCw", "AI"],
  ["UCfu0YIJFvtMYFxvI1r5HPpg", "AI"],
  ["UCq_L4pHHIuWBW6OSKKxBbgw", "AI"],
  ["UCfEJzUftrJW0GhFuY-jOJ7A", "Бизнес"],
  ["UCoosOi7ok8jJKl7rb0xhlWQ", "Технологии"],
  ["UCL-HTw4Wfi9Igh9r1CBrrDA", "Бизнес"],
  ["UCFJnZHIusOlHr-pbYVHmr-A", "Бизнес"],
  ["UCqy1GczwhhO9p7dfx7FzhMw", "Бизнес"],
  ["UCKyNmWAGzC-qhRxKg89Y9lg", "Образование"],
  ["UCy5E4aFQdeX9cvRC4sttsSw", "Здоровье"],
  ["UCZTny_iCi1T6mHwmUso6p7Q", "AI"],
];

async function main() {
  let updated = 0;
  for (const [ytId, category] of CATEGORIES) {
    const result = await prisma.channel.updateMany({
      where: { youtubeChannelId: ytId },
      data: { category },
    });
    if (result.count > 0) {
      updated++;
      console.log(`[OK] ${ytId} → ${category}`);
    } else {
      console.log(`[MISS] ${ytId}`);
    }
  }
  console.log(`\nUpdated ${updated} channels.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
