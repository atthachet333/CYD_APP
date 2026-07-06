// @ts-nocheck
import { defineConfig } from 'prisma';

export default defineConfig({
  datasource: {
    db: {
      url: "mysql://chaiyade_dms:dms123456@chaiyadetprogress.org:3306/chaiyade_dms",
    },
  },
});