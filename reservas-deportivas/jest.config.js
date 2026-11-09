// Pruebas unitarias de la lógica pura (grilla, reglas, fechas, semilla) con ts-jest.
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { strict: true, esModuleInterop: true, module: 'commonjs', target: 'es2020', types: ['jest'] }, diagnostics: { ignoreCodes: [151001] } }],
  },
};
