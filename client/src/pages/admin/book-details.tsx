// src/pages/admin/book-detail.tsx
// == IMPORTS & DEPENDENCIES ==
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'wouter';
import { ChevronLeft, Edit, BookOpen, Loader2, Sparkles, GraduationCap } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { motion, AnimatePresence } from '@/lib/motionShim';

// == Animation presets (UI-only) ==
const fadeIn = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};
const fadeInFast = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const itemFade = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut' } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.2, ease: 'easeIn' } },
};

// CLEANED: Replaced gold theme with crisp slate lines and professional blue interaction states
const cardBase =
  'group border border-slate-200 hover:border-blue-500 transition-all duration-300 ' +
  'shadow-sm hover:shadow-xl bg-white rounded-2xl will-change-transform';

// Types for structural clarity
interface Question {
  questionText: string;
  answerType: 'text' | 'multiple_choice';
  options?: string;
  correctAnswer?: string;
}

interface PageData {
  id: number;
  pageNumber: number;
  title?: string;
  imageUrl?: string;
  content: string;
  questions?: Question[];
}

// == BOOK DETAILS COMPONENT ==
export default function BookDetails() {
  const { id } = useParams<{ id: string }>();
  const bookId = parseInt(id || '0', 10);
  const [activeTab, setActiveTab] = useState<string>('pages');

  // == DATA FETCHING ==
  const { data: bookData, isLoading } = useQuery({
    queryKey: [`/api/books/${bookId}`],
    queryFn: async () => {
      interface BookResponse { book: any }
      const response = await apiRequest<BookResponse>('GET', `/api/books/${bookId}`);
      if (response && response.book) return response.book;
      throw new Error('Failed to fetch book data');
    },
    enabled: !!bookId
  });

  const { data: pagesData } = useQuery<PageData[]>({
    queryKey: [`/api/books/${bookId}/pages`],
    queryFn: async () => {
      interface PagesResponse { pages: PageData[] }
      const response = await apiRequest<PagesResponse>('GET', `/api/books/${bookId}/pages`);
      if (response && response.pages) return response.pages;
      return [];
    },
    enabled: !!bookId
  });

  // == UTILS ==
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(date);
  };

  const formatSubject = (subject: string) => {
    const subjectMap: Record<string, string> = {
      'filipino-literature': 'Filipino Literature',
      'philippine-folklore': 'Philippine Folklore',
      'reading-comprehension': 'Reading Comprehension',
      'creative-writing': 'Creative Writing',
      'general-education': 'General Education'
    };
    return subjectMap[subject] || subject;
  };

  // == LOADING STATE ==
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-slate-100 to-indigo-50/50 font-sans font-bold">
        <Header variant="admin" />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 bg-white rounded-xl p-8 border border-slate-200 shadow-md">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            <p className="text-base font-sans font-bold text-slate-800">Loading book data...</p>
          </div>
        </main>
      </div>
    );
  }

  // == ERROR STATE ==
  if (!bookData) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-slate-100 to-indigo-50/50 font-sans font-bold">
        <Header variant="admin" />
        <main className="flex-1 flex items-center justify-center">
          <div className="border border-slate-200 bg-white rounded-xl shadow-md max-w-md w-full">
            <div className="border-b border-slate-200 p-6">
              <h3 className="text-2xl font-sans font-bold text-slate-900">Book Not Found</h3>
              <p className="text-slate-500 mt-1">We couldn't find the book you're looking for.</p>
            </div>
            <div className="p-6">
              <Link href="/admin/books">
                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-sans font-bold">
                  <ChevronLeft className="h-4 w-4 mr-2" /> Back to Books
                </Button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const hasQuestions = pagesData && pagesData.some((p) => p.questions && p.questions.length > 0);

  // == RENDER COMPONENT ==
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-slate-100 to-indigo-50/50 font-sans font-bold">
      <Header variant="admin" />

      {/* == Header Section == */}
      <motion.div
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        className="bg-slate-900 text-white py-8 shadow-md relative overflow-hidden"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 [mask-image:radial-gradient(60%_60%_at_20%_20%,black,transparent)]" />
        <div className="container mx-auto px-4 text-center relative">
          <div className="flex items-center justify-center mb-2">
            <GraduationCap className="h-8 w-8 text-sky-400 mr-3" />
            <span className="text-sm md:text-base text-sky-400 tracking-wide uppercase">
              Adonai And Grace Inc.
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-sans font-bold text-white">Book Details</h1>
          <p className="text-slate-300">Comprehensive view of learning material</p>
        </div>
      </motion.div>

      <main className="flex-1 py-8 container mx-auto px-4">
        {/* == Navigation == */}
        <motion.div
          variants={fadeInFast}
          initial="hidden"
          animate="visible"
          className="flex justify-between items-center mb-8"
        >
          <div className="flex items-center gap-2">
            <Link href="/admin/books">
              <Button variant="outline" className="border border-slate-300 text-slate-700 hover:bg-slate-50 font-sans font-bold">
                <ChevronLeft className="h-4 w-4 mr-2" /> Back to Books
              </Button>
            </Link>
            <Link href="/admin">
              <Button variant="outline" size="sm" className="border border-slate-300 text-slate-700 hover:bg-slate-50 font-sans font-bold">
                Back to Dashboard
              </Button>
            </Link>
          </div>
          <Link href={`/admin/edit-book/${bookId}`}>
            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-sans font-bold transition-transform hover:-translate-y-0.5">
              <Edit className="h-4 w-4 mr-2" /> Edit Book
            </Button>
          </Link>
        </motion.div>

        {/* == Content Grid == */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        >
          {/* == Book Information == */}
          <motion.div variants={fadeIn} className="lg:col-span-1">
            <div className={cardBase}>
              <div className="border-b border-slate-200 p-6 rounded-t-2xl">
                <h3 className="text-xl font-sans font-bold text-slate-800 flex items-center">
                  <Sparkles className="h-5 w-5 text-blue-600 mr-2" /> Book Information
                </h3>
              </div>
              <div className="p-6">
                {/* Cover & Title */}
                <div className="flex flex-col items-center mb-6">
                  {bookData.coverImage ? (
                    <img
                      src={bookData.coverImage}
                      alt={bookData.title}
                      className="rounded-xl w-full max-w-[250px] object-cover aspect-[3/4] mb-4 shadow-md border border-slate-200"
                    />
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl w-full max-w-[250px] aspect-[3/4] mb-4 flex items-center justify-center">
                      <BookOpen className="h-14 w-14 text-slate-400" />
                    </div>
                  )}
                  <h2 className="text-2xl font-sans font-bold text-center mt-2 text-slate-900">{bookData.title}</h2>
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                    <Badge className={bookData.type === 'storybook' ? 'bg-slate-900 text-white font-semibold' : 'bg-blue-50 text-blue-700 border border-blue-100 font-semibold'}>
                      {bookData.type === 'storybook' ? 'Storybook' : 'Educational'}
                    </Badge>
                    {bookData.type === 'educational' && bookData.subject && (
                      <Badge variant="outline" className="border border-slate-200 text-slate-600 font-semibold bg-slate-50">
                        {formatSubject(bookData.subject)}
                      </Badge>
                    )}
                    {bookData.grade && (
                      <Badge variant="outline" className="border border-slate-200 text-slate-600 font-semibold bg-slate-50">
                        Grade {bookData.grade === 'K' ? 'K' : bookData.grade}
                      </Badge>
                    )}
                  </div>
                </div>

                <Separator className="my-4 bg-slate-200" />

                {/* Details */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-sans font-bold text-slate-800">Description</h3>
                    <p className="mt-1 text-slate-600 font-normal">{bookData.description}</p>
                  </div>
                  {bookData.type === 'educational' && bookData.subject && (
                    <div>
                      <h3 className="text-sm font-sans font-bold text-slate-800">Subject Category</h3>
                      <p className="mt-1 text-slate-600 font-normal">{formatSubject(bookData.subject)}</p>
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-sans font-bold text-slate-800">Pages</h3>
                    <p className="mt-1 text-slate-600 font-normal">{pagesData?.length || 0} pages</p>
                  </div>
                  {bookData.createdAt && (
                    <div>
                      <h3 className="text-sm font-sans font-bold text-slate-800">Added On</h3>
                      <p className="mt-1 text-slate-600 font-normal">{formatDate(bookData.createdAt)}</p>
                    </div>
                  )}
                  {bookData.musicUrl && (
                    <div>
                      <h3 className="text-sm font-sans font-bold text-slate-800">Background Music</h3>
                      <div className="mt-1">
                        <audio controls className="w-full" src={bookData.musicUrl}>
                          Your browser does not support the audio element.
                        </audio>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* == Book Content Tabs == */}
          <motion.div variants={fadeIn} className="lg:col-span-2">
            <div className={cardBase}>
              <div className="border-b border-slate-200 p-6 rounded-t-2xl">
                <h3 className="text-xl font-sans font-bold text-slate-800">Book Content</h3>
                <p className="text-slate-500 text-sm font-normal">View pages and questions for this book</p>
              </div>
              <div className="p-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-slate-100 rounded-lg p-1">
                    <TabsTrigger value="pages" className="font-sans font-semibold data-[state=active]:bg-slate-900 data-[state=active]:text-white">
                      Pages
                    </TabsTrigger>
                    <TabsTrigger value="questions" className="font-sans font-semibold data-[state=active]:bg-slate-900 data-[state=active]:text-white">
                      Questions
                    </TabsTrigger>
                  </TabsList>

                  <div className="pt-6">
                    <AnimatePresence mode="wait">
                      <TabsContent value="pages" key="pages-content" className="m-0 p-0">
                        {pagesData && pagesData.length > 0 ? (
                          <motion.div 
                            variants={stagger} 
                            initial="hidden" 
                            animate="visible" 
                            exit="hidden" 
                            className="space-y-6"
                          >
                            {pagesData.map((page) => (
                              <motion.div
                                key={`page-${page.id}`}
                                variants={itemFade}
                                className="border border-slate-200 bg-slate-50/50 rounded-lg"
                              >
                                <div className="border-b border-slate-200 p-4 rounded-t-lg bg-slate-50/80">
                                  <h4 className="text-base font-sans font-bold text-slate-800">
                                    Page {page.pageNumber}{page.title ? `: ${page.title}` : ''}
                                  </h4>
                                </div>
                                <div className="p-4 bg-white rounded-b-lg">
                                  <div className="flex flex-col md:flex-row gap-4">
                                    {page.imageUrl && (
                                      <div className="w-full md:w-1/3">
                                        <img
                                          src={page.imageUrl}
                                          alt={`Page ${page.pageNumber}`}
                                          className="rounded-lg w-full object-cover aspect-video border border-slate-200"
                                        />
                                      </div>
                                    )}
                                    <div className={`w-full ${page.imageUrl ? 'md:w-2/3' : ''}`}>
                                      <p className="whitespace-pre-line text-slate-700 font-normal">{page.content}</p>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </motion.div>
                        ) : (
                          <motion.div
                            variants={itemFade}
                            initial="hidden"
                            animate="visible"
                            className="py-8 text-center bg-slate-50 rounded-lg border border-slate-200"
                          >
                            <p className="text-slate-500 italic font-normal">No pages found for this book.</p>
                          </motion.div>
                        )}
                      </TabsContent>

                      <TabsContent value="questions" key="questions-content" className="m-0 p-0">
                        {hasQuestions ? (
                          <motion.div 
                            variants={stagger} 
                            initial="hidden" 
                            animate="visible" 
                            exit="hidden" 
                            className="space-y-6"
                          >
                            {pagesData
                              .filter((p) => p.questions && p.questions.length > 0)
                              .map((page) => (
                                <motion.div
                                  key={`questions-card-${page.id}`}
                                  variants={itemFade}
                                  className="border border-slate-200 bg-slate-50/50 rounded-lg"
                                >
                                  <div className="border-b border-slate-200 p-4 rounded-t-lg bg-slate-50/80">
                                    <h4 className="text-base font-sans font-bold text-slate-800">
                                      Page {page.pageNumber}{page.title ? ` - ${page.title}` : ''} Questions
                                    </h4>
                                  </div>
                                  <div className="p-4 bg-white rounded-b-lg">
                                    <div className="space-y-4">
                                      {page.questions?.map((question, index) => (
                                        <motion.div
                                          key={`question-${page.id}-${index}`}
                                          variants={itemFade}
                                          className="p-4 border border-slate-200 rounded-lg bg-white"
                                        >
                                          <h4 className="font-sans font-bold mb-2 text-slate-900">
                                            Question {index + 1}: {question.questionText}
                                          </h4>
                                          <div className="ml-4">
                                            <p className="text-sm text-slate-500 mb-1 font-normal">
                                              Type: {question.answerType === 'text' ? 'Text Answer' : 'Multiple Choice'}
                                            </p>
                                            {question.answerType === 'multiple_choice' && question.options && (
                                              <div className="mt-2">
                                                <p className="text-sm text-slate-500 mb-1 font-normal">Options:</p>
                                                <ul className="list-disc pl-5 font-normal">
                                                  {question.options.split('\n').map((option, optIdx) => (
                                                    <li
                                                      key={`opt-${page.id}-${index}-${optIdx}`}
                                                      className={option === question.correctAnswer ? 'font-bold text-emerald-600' : 'text-slate-700'}
                                                    >
                                                      {option}
                                                      {option === question.correctAnswer && ' (correct)'}
                                                    </li>
                                                  ))}
                                                </ul>
                                              </div>
                                            )}
                                            {question.answerType === 'text' && question.correctAnswer && (
                                              <p className="text-sm mt-2 font-normal">
                                                <span className="text-slate-500">Correct answer:</span>{' '}
                                                <span className="font-bold text-emerald-600">{question.correctAnswer}</span>
                                              </p>
                                            )}
                                          </div>
                                        </motion.div>
                                      ))}
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                          </motion.div>
                        ) : (
                          <motion.div
                            variants={itemFade}
                            initial="hidden"
                            animate="visible"
                            className="py-8 text-center bg-slate-50 rounded-lg border border-slate-200"
                          >
                            <p className="text-slate-500 italic font-normal">No questions found for this book.</p>
                          </motion.div>
                        )}
                      </TabsContent>
                    </AnimatePresence>
                  </div>
                </Tabs>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}