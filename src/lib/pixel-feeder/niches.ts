export interface NichePreset {
  id: string;
  label: string;
  category: string;
  sampleProducts: string[];
}

export const NICHE_PRESETS: NichePreset[] = [
  {
    id: "general",
    label: "Geral / E-commerce",
    category: "E-commerce & Varejo",
    sampleProducts: [
      "Kit Organizador Premium",
      "Smartwatch Pro Series",
      "Luminária LED Touch",
      "Fone Bluetooth Noise Cancelling",
      "Mochila Antifurto Impermeável",
    ],
  },
  {
    id: "lingerie",
    label: "Lingerie & Moda Íntima",
    category: "Lingerie & Moda Íntima",
    sampleProducts: [
      "Sutiã Invisível Confort Sem Costura",
      "Body Rendado Modelador Elegance",
      "Conjunto Renda Soft Push-Up",
      "Calcinha Absorvente Conforto Diário",
      "Cinta Modeladora Waist Shaper",
    ],
  },
  {
    id: "fashion-women",
    label: "Moda Feminina & Vestuário",
    category: "Moda Feminina & Vestuário",
    sampleProducts: [
      "Vestido Midi Linho Casual",
      "Blazer Alfaiataria Estruturado",
      "Conjunto Cropped & Saia Longa",
      "Calça Wide Leg Jeans Confort",
      "Camisa Seda Premium Oversized",
    ],
  },
  {
    id: "fashion-men",
    label: "Moda Masculina & Calçados",
    category: "Moda Masculina & Calçados",
    sampleProducts: [
      "Tênis Couro Casual Urban",
      "Camisa Linho Manga Longa Slim",
      "Bermuda Chino Confort",
      "Jaqueta Corta-Vento Street",
      "Carteira Couro Genuíno Minimalista",
    ],
  },
  {
    id: "beauty-skincare",
    label: "Cosméticos & Cuidados com a Pele",
    category: "Cosméticos & Cuidados com a Pele",
    sampleProducts: [
      "Sérum Vitamina C Clareador & Glow",
      "Ácido Hialurônico Preenchedor Facial",
      "Protetor Solar Toque Seco FPS 60",
      "Máscara Noturna Hidratação Profunda",
      "Óleo Reparador Capilar Miracle",
    ],
  },
  {
    id: "health-weightloss",
    label: "Saúde, Emagrecimento & Fitness",
    category: "Saúde, Emagrecimento & Suplementos",
    sampleProducts: [
      "Complexo Termogênico Queima Turbo",
      "Creatina Monohidratada 100% Pura",
      "Colágeno Hidrolisado Verisol",
      "Whey Isolate Proteína Pura",
      "Melatonina Gotas Sono Reparador",
    ],
  },
  {
    id: "infoproducts",
    label: "Infoprodutos & Renda Extra",
    category: "Educação, Cursos Online & Renda Extra",
    sampleProducts: [
      "Método Vendas Automáticas 10k",
      "Formação Especialista em Tráfego Pago",
      "Mentoria Exclusiva de Escala Digital",
      "Pack 1000+ Criativos Validados",
      "Masterclass Automação com Inteligência Artificial",
    ],
  },
  {
    id: "dropshipping",
    label: "Dropshipping & Gadgets Tech",
    category: "Gadgets Tecnológicos & Inovação",
    sampleProducts: [
      "Mini Projetor Portátil 4K Ultra",
      "Suporte Veicular Magnético MagSafe",
      "Liquidificador Portátil USB Fresh",
      "Powerbank Indução 20000mAh",
      "Aspirador Portátil Sem Fio Turbo",
    ],
  },
  {
    id: "jewelry",
    label: "Joias, Semijoias & Acessórios",
    category: "Joias, Semijoias & Acessórios",
    sampleProducts: [
      "Colar Ponto de Luz Banhado a Ouro 18k",
      "Anel Solitário Zircônia Premium",
      "Brinco Argola Cravejada Zircônias",
      "Pulseira Riviera Prata 925",
      "Escapulário Masculino Aço Cirúrgico",
    ],
  },
  {
    id: "home",
    label: "Casa, Decoração & Cozinha",
    category: "Casa, Decoração & Utilidades",
    sampleProducts: [
      "Kit Frigideiras Antiaderente Cerâmica",
      "Difusor Ultrassônico Aromaterapia",
      "Jogo de Toalhas Fio Penteado Luxo",
      "Organizador de Armário Acrílico",
      "Torneira Gourmet Flexível Monocomando",
    ],
  },
  {
    id: "custom",
    label: "Personalizado / Outro Nicho",
    category: "Personalizado",
    sampleProducts: [
      "Produto Exclusivo",
    ],
  },
];
